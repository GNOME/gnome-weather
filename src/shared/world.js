// -*- Mode: js; indent-tabs-mode: nil; c-basic-offset: 4; tab-width: 4 -*-
//
// Copyright (c) 2012 Giovanni Campagna <scampa.giovanni@gmail.com>
//
// Gnome Weather is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by the
// Free Software Foundation; either version 2 of the License, or (at your
// option) any later version.
//
// Gnome Weather is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
// for more details.
//
// You should have received a copy of the GNU General Public License along
// with Gnome Weather; if not, write to the Free Software Foundation,
// Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GWeather from 'gi://GWeather';

import * as Util from '../misc/util.js';

export const WorldModel = GObject.registerClass({
    Signals: {
        'selected-location-changed': { param_types: [GWeather.Info] },
    },
    Properties: {
        'loading': GObject.ParamSpec.boolean('loading', '', '', GObject.ParamFlags.READABLE, false)
    },
    Implements: [Gio.ListModel]
}, class WorldModel extends GObject.Object {

    constructor(world) {
        super();

        this._world = world;

        this._settings = Util.getSettings('org.gnome.Weather');
        this._providers = Util.getEnabledProviders();

        this._loadingCount = 0;

        this._currentLocationInfo = null;
        this._selectedLocation = null;
        this._infoList = [];
        this.getAll();
    }

    get length() {
        return this._allInfos.length
    }

    getAll() {
        // Ensure the current location and selected location are returned first...
        const infos = [...this._infoList].filter(info => !this.isCurrentLocation(info) && !this.isSelectedLocation(info));

        if (this._currentLocationInfo)
            infos.unshift(this._currentLocationInfo);

        if (this._selectedLocation && this._currentLocationInfo !== this._selectedLocation) {
            infos.unshift(this._selectedLocation);
        }

        this._allInfos = infos;
        return infos;
    }

    getAtIndex(index) {
        if (this._selectedLocation) {
            if (index == 0)
                return this._selectedLocation;
            else
                index--;
        }
        if (this._currentLocationInfo) {
            if (index == 1)
                return this._currentLocationInfo;
            else
                index--;
        }

        return this._infoList[index];
    }

    getCurrentLocation() {
        return this._currentLocationInfo;
    }

    currentLocationChanged(location) {
        if (location) {
            this._currentLocationInfo = this.buildInfo(location);
            this.addCurrentLocation(this._currentLocationInfo);
            this.#invalidate();
        }
    }

    getRecent() {
        if (this._infoList.length > 0)
            return this._infoList[0];
        else
            return null;
    }

    load() {
        let locations = this._settings.get_value('locations').deep_unpack();

        if (locations.length > 10) {
            locations = locations.slice(0, 10).filter(location => !!location);
            this._settings.set_value('locations', new GLib.Variant('av', locations));
        }

        let info = null;
        for (let i = locations.length - 1; i >= 0; i--) {
            let variant = locations[i];
            let location = this._world.deserialize(variant);

            info = this._addLocationInternal(location);
        }

        if (info) {
            this.setSelectedLocation(info);
        }

        this.#invalidate();
    }

    #invalidate() {
        this.getAll();
        this.items_changed(0, this._allInfos.length, this._allInfos.length);
    }

    _updateLoadingCount(delta) {
        let wasLoading = this._loadingCount > 0;
        this._loadingCount += delta;
        let isLoading = this._loadingCount > 0;

        if (wasLoading != isLoading)
            this.notify('loading');
    }

    updateInfo(info) {
        if (info._loadingId)
            return;

        info._loadingId = info.connect('updated', (info) => {
            info.disconnect(info._loadingId);
            info._loadingId = 0;

            this._updateLoadingCount(-1);
        });

        info.update();
        this._updateLoadingCount(+1);
    }

    get loading() {
        return this._loadingCount > 0;
    }

    setSelectedLocation(info) {
        const newInfo = this.addNewLocation(info.get_location());
        this._selectedLocation = newInfo;
        this.emit('selected-location-changed', info);
    }

    isSelectedLocation(info) {
        return !!this._selectedLocation && this._selectedLocation === info;
    }

    isCurrentLocation(info) {
        return !!this._currentLocationInfo && this._currentLocationInfo === info;
    }

    addNewLocation(newLocation) {
        let info = this._addLocationInternal(newLocation);
        this._selectedLocation = info;
        info._isCurrentLocation = false;

        this.#invalidate();

        this._queueSaveSettings();
        return info;
    }

    _queueSaveSettings() {
        if (this._queueSaveSettingsId)
            return;

        let id = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._queueSaveSettingsId = 0;
            this._saveSettingsInternal();
            return false;
        });
        this._queueSaveSettingsId = id;
    }

    _saveSettingsInternal() {
        let locations = [];

        for (const info of this._allInfos) {
            if (!info._isCurrentLocation) {
                let serialized = null;
                try {
                    serialized = info.location.serialize();
                } catch (error) {
                    console.error(error);
                }

                if (serialized)
                    locations.push(serialized);
            }
        }

        this._settings.set_value('locations', new GLib.Variant('av', locations));
    }

    saveSettingsNow() {
        if (!this._queueSaveSettingsId)
            return;

        GLib.source_remove(this._queueSaveSettingsId);
        this._queueSaveSettingsId = 0;

        this._saveSettingsInternal();
    }

    addCurrentLocation(info) {
        if (this._infoList.includes(info))
            return;

        const existingInfo = this._infoList.find(i => i.get_location().equal(info.location));
        if (existingInfo) {
            this._currentLocationInfo = existingInfo;
            return;
        }

        info._isCurrentLocation = true;
        this._addInfoInternal(info);
    }

    removeLocation(oldInfo) {
        this._removeLocationInternal(oldInfo);
    }

    _removeLocationInternal(oldInfo, skipDisconnect) {
        if (!oldInfo) return;

        if (oldInfo._loadingId && !skipDisconnect) {
            oldInfo.disconnect(oldInfo._loadingId);
            oldInfo._loadingId = 0;
            this._updateLoadingCount(-1);
        }

        if (oldInfo == this._currentLocationInfo)
            this._currentLocationInfo = null;

        for (let i = 0; i < this._allInfos.length; i++) {
            if (this._allInfos[i] == oldInfo) {
                this.items_changed(i, 1, 0);
                break;
            }
        }
        for (let i = 0; i < this._infoList.length; i++) {
            if (this._infoList[i] == oldInfo) {
                this._infoList.splice(i, 1);
                break;
            }
        }

        this.getAll();
        this._queueSaveSettings();
    }

    buildInfo(location) {
        return new GWeather.Info({
            application_id: pkg.name,
            contact_info: 'https://gitlab.gnome.org/GNOME/gnome-weather/-/raw/master/gnome-weather.doap',
            location,
            enabled_providers: this._providers
        });
    }

    _addLocationInternal(newLocation) {
        const existingInfo = this._infoList.find(info => info.get_location().equal(newLocation));
        if (existingInfo)
            return existingInfo;

        let info = this.buildInfo(newLocation);
        this._addInfoInternal(info);

        return info;
    }

    _addInfoInternal(info) {
        this._infoList.unshift(info);
        this.updateInfo(info);

        if (this._infoList.length > 10) {
            let oldInfo = this._infoList.pop();
            this._removeLocationInternal(oldInfo);
        }
    }

    vfunc_get_item_type() {
        return GWeather.Info.$gtype;
    }

    vfunc_get_n_items() {
        return this._allInfos.length;
    }

    vfunc_get_item(n) {
        return this._allInfos[n] ?? null;
    }
});
