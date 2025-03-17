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

type GWeatherInfoData = GWeather.Info & {
    _isCurrentLocation?: boolean;
    _loadingId?: number;
}

export class WorldModel extends GObject.Object {
    _world?: GWeather.Location;
    _settings: Gio.Settings;
    _providers: number;
    _loadingCount: number;
    _currentLocationInfo?: GWeatherInfoData;
    _selectedLocation?: GWeatherInfoData;
    _infoList: GWeatherInfoData[];
    _allInfos: GWeatherInfoData[];
    _queueSaveSettingsId?: number;

    constructor(world?: GWeather.Location) {
        super();

        this._world = world;

        this._settings = Util.getSettings('org.gnome.Weather');
        this._providers = Util.getEnabledProviders();

        this._loadingCount = 0;

        this._infoList = [];
        this._allInfos = [];
        this.getAll();
    }

    get length(): number {
        return this._allInfos.length
    }

    getAll(): GWeatherInfoData[] {
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

    getAtIndex(index: number): GWeatherInfoData {
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

    getCurrentLocation(): GWeatherInfoData | undefined {
        return this._currentLocationInfo;
    }

    currentLocationChanged(location?: GWeather.Location): void {
        if (location) {
            this._currentLocationInfo = this.buildInfo(location);
            this.addCurrentLocation(this._currentLocationInfo);
            this.#invalidate();
        }
    }

    getRecent(): GWeatherInfoData | null {
        if (this._infoList.length > 0)
            return this._infoList[0];
        else
            return null;
    }

    load(): void {
        let locations: GLib.Variant[] = this._settings.get_value('locations').deep_unpack();

        if (locations.length > 10) {
            locations = locations.slice(0, 10).filter(location => !!location);
            this._settings.set_value('locations', new GLib.Variant('av', locations));
        }

        let info = null;
        for (let i = locations.length - 1; i >= 0; i--) {
            const variant = locations[i];
            const location = this._world?.deserialize(variant);

            if (location) {
                info = this._addLocationInternal(location);
            }
        }

        if (info) {
            this.setSelectedLocation(info);
        }

        this.#invalidate();
    }

    #invalidate(): void {
        this.getAll();
        // @ts-expect-error ts-for-gir doesn't know how to handle interfaces
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this.items_changed(0, this._allInfos.length, this._allInfos.length);
    }

    _updateLoadingCount(delta: number): void {
        const wasLoading = this._loadingCount > 0;
        this._loadingCount += delta;
        const isLoading = this._loadingCount > 0;

        if (wasLoading != isLoading)
            this.notify('loading');
    }

    updateInfo(info: GWeather.Info & { _loadingId?: number; }): void {
        if (info._loadingId)
            return;

        info._loadingId = info.connect('updated', (info) => {
            if (info._loadingId) {
                info.disconnect(info._loadingId);
                info._loadingId = 0;
            }

            this._updateLoadingCount(-1);
        });

        info.update();
        this._updateLoadingCount(+1);
    }

    get loading(): boolean {
        return this._loadingCount > 0;
    }

    setSelectedLocation(info: GWeather.Info): void {
        const newInfo = this.addNewLocation(info.get_location());
        this._selectedLocation = newInfo;
        this.emit('selected-location-changed', info);
    }

    isSelectedLocation(info: GWeather.Info): boolean {
        return !!this._selectedLocation && this._selectedLocation === info;
    }

    isCurrentLocation(info: GWeather.Info): boolean {
        return !!this._currentLocationInfo && this._currentLocationInfo === info;
    }

    addNewLocation(newLocation: GWeather.Location): GWeatherInfoData {
        const info: GWeatherInfoData = this._addLocationInternal(newLocation);
        this._selectedLocation = info;
        info._isCurrentLocation = false;

        this.#invalidate();

        this._queueSaveSettings();
        return info;
    }

    _queueSaveSettings(): void {
        if (this._queueSaveSettingsId)
            return;

        const id = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._queueSaveSettingsId = 0;
            this._saveSettingsInternal();
            return false;
        });
        this._queueSaveSettingsId = id;
    }

    _saveSettingsInternal(): void {
        const locations = [];

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

    saveSettingsNow(): void {
        if (!this._queueSaveSettingsId)
            return;

        GLib.source_remove(this._queueSaveSettingsId);
        this._queueSaveSettingsId = 0;

        this._saveSettingsInternal();
    }

    addCurrentLocation(info: GWeatherInfoData): void {
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

    removeLocation(oldInfo?: GWeatherInfoData): void {
        this._removeLocationInternal(oldInfo);
    }

    _removeLocationInternal(oldInfo?: GWeatherInfoData): void {
        if (!oldInfo) return;

        if (oldInfo._loadingId) {
            oldInfo.disconnect(oldInfo._loadingId);
            oldInfo._loadingId = 0;
            this._updateLoadingCount(-1);
        }

        if (oldInfo == this._currentLocationInfo)
            this._currentLocationInfo = undefined;

        for (let i = 0; i < this._allInfos.length; i++) {
            if (this._allInfos[i] == oldInfo) {
                // @ts-expect-error ts-for-gir doesn't know how to handle interfaces
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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

    buildInfo(location: GWeather.Location): GWeatherInfoData {
        return new GWeather.Info({
            application_id: pkg.name,
            contact_info: 'https://gitlab.gnome.org/GNOME/gnome-weather/-/raw/master/gnome-weather.doap',
            location,
            enabled_providers: this._providers
        });
    }

    _addLocationInternal(newLocation: GWeather.Location): GWeatherInfoData {
        const existingInfo = this._infoList.find(info => info.get_location().equal(newLocation));
        if (existingInfo)
            return existingInfo;

        const info = this.buildInfo(newLocation);
        this._addInfoInternal(info);

        return info;
    }

    _addInfoInternal(info: GWeather.Info): void {
        this._infoList.unshift(info);
        this.updateInfo(info);

        if (this._infoList.length > 10) {
            const oldInfo = this._infoList.pop();
            if (oldInfo) {
                this._removeLocationInternal(oldInfo);
            }
        }
    }

    vfunc_get_item_type(): GObject.GType {
        return GWeather.Info.$gtype;
    }

    vfunc_get_n_items(): number {
        return this._allInfos.length;
    }

    vfunc_get_item(n: number): GWeatherInfoData | null {
        return this._allInfos[n] ?? null;
    }
};

GObject.registerClass({
    Signals: {
        'selected-location-changed': { param_types: [GWeather.Info.$gtype] },
    },
    Properties: {
        'loading': GObject.ParamSpec.boolean('loading', '', '', GObject.ParamFlags.READABLE, false)
    },
    Implements: [Gio.ListModel]
}, WorldModel)