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

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const GWeather = imports.gi.GWeather;
const Lang = imports.lang;

const Params = imports.misc.params;
const Util = imports.misc.util;

var WorldModel = new Lang.Class({
    Name: 'WorldModel',
    Extends: GObject.Object,
    Signals: {
        'current-location-changed': { param_types: [ GWeather.Info ] },
        'location-added': { param_types: [ GWeather.Info, GObject.Boolean ] },
        'location-removed': { param_types: [ GWeather.Info ] }
    },
    Properties: {
        'loading': GObject.ParamSpec.boolean('loading', '', '', GObject.ParamFlags.READABLE, false)
    },

    _init: function(world, enableGtk) {
        this.parent();

        this._world = world;

        this._settings = Util.getSettings('org.gnome.Weather.Application');
        this._providers = Util.getEnabledProviders();

        this._loadingCount = 0;

        this._currentLocationInfo = null;
        this._infoList = [];
    },

    get length() {
        return this._infoList.length + (this._currentLocationInfo ? 1 : 0);
    },

    getAll: function() {
        if (this._currentLocationInfo)
            return [this._currentLocationInfo].concat(this._infoList);
        else
            return [].concat(this._infoList);
    },

    getAtIndex: function(index) {
        if (this._currentLocationInfo) {
            if (index == 0)
                return this._currentLocationInfo;
            else
                index--;
        }

        return this._infoList[index];
    },

    getCurrentLocation: function() {
        return this._currentLocationInfo;
    },

    currentLocationChanged: function(location) {
        if (this._currentLocationInfo)
            this._removeLocationInternal(this._currentLocationInfo, false);

        let info;
        if (location)
            info = this.addNewLocation(location, true);
        else
            info = null;
        this.emit('current-location-changed', info);
    },

    getRecent: function() {
        if (this._infoList.length > 0)
            return this._infoList[0];
        else
            return null;
    },

    load: function () {
        let locations = this._settings.get_value('locations').deep_unpack();

        if (locations.length > 5) {
            locations = locations.slice(0, 5);
            this._settings.set_value('locations', new GLib.Variant('av', locations));
        }

        let info = null;
        for (let i = locations.length - 1; i >= 0; i--) {
            let variant = locations[i];
            let location = this._world.deserialize(variant);

            info = this._addLocationInternal(location, false);
        }
    },

    _updateLoadingCount: function(delta) {
        let wasLoading = this._loadingCount > 0;
        this._loadingCount += delta;
        let isLoading = this._loadingCount > 0;

        if (wasLoading != isLoading)
            this.notify('loading');
    },

    updateInfo: function(info) {
        if (info._loadingId)
            return;

        info._loadingId = info.connect('updated', (info) => {
            info.disconnect(info._loadingId);
            info._loadingId = 0;

            this._updateLoadingCount(-1);
        });

        info.update();
        this._updateLoadingCount(+1);
    },

    get loading() {
        return this._loadingCount > 0;
    },

    addNewLocation: function(newLocation, isCurrentLocation) {
        if (!isCurrentLocation) {
            for (let info of this._infoList) {
                let location = info.location;
                if (location.equal(newLocation)) {
                    this.moveLocationToFront(info);
                    return info;
                }
            }
        }

        let info = this._addLocationInternal(newLocation, isCurrentLocation);

        if (!isCurrentLocation)
            this._queueSaveSettings();

        return info;
    },

    _queueSaveSettings: function() {
        if (this._queueSaveSettingsId)
            return;

        let id = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
            this._queueSaveSettingsId = 0;
            this._saveSettingsInternal();
            return false;
        });
        this._queueSaveSettingsId = id;
    },

    _saveSettingsInternal: function() {
        let locations = [];

        for (let i = 0; i < this._infoList.length; i++) {
            if (!this._infoList[i]._isCurrentLocation)
                locations.push(this._infoList[i].location.serialize());
        }

        this._settings.set_value('locations', new GLib.Variant('av', locations));
    },

    saveSettingsNow: function() {
        if (!this._queueSaveSettingsId)
            return;

        GLib.source_remove(this._queueSaveSettingsId);
        this._queueSaveSettingsId = 0;

        this._saveSettingsInternal();
    },

    moveLocationToFront: function(info) {
        if (this._infoList.length == 0 || this._infoList[0] == info)
            return;

        this._removeLocationInternal(info, true);
        this._addInfoInternal(info, info._isCurrentLocation);

        // mark info as a manually chosen location so that we
        // save it
        info._isCurrentLocation = false;

        this._queueSaveSettings();
    },

    _removeLocationInternal: function(oldInfo, skipDisconnect) {
        if (oldInfo._loadingId && !skipDisconnect) {
            oldInfo.disconnect(oldInfo._loadingId);
            oldInfo._loadingId = 0;
            this._updateLoadingCount(-1);
        }

        if (oldInfo == this._currentLocationInfo)
            this._currentLocationInfo = null;

        for (let i = 0; i < this._infoList.length; i++) {
            if (this._infoList[i] == oldInfo) {
                this._infoList.splice(i, 1);
                break;
            }
        }

        this.emit('location-removed', oldInfo);
    },

    _addLocationInternal: function(newLocation, isCurrentLocation) {
        let info = new GWeather.Info({ location: newLocation,
                                       enabled_providers: this._providers });
        this._addInfoInternal(info, isCurrentLocation);

        return info;
    },

    _addInfoInternal: function(info, isCurrentLocation) {
        info._isCurrentLocation = isCurrentLocation;
        this._infoList.unshift(info);
        this.updateInfo(info);

        if (isCurrentLocation)
            this._currentLocationInfo = info;

        this.emit('location-added', info, isCurrentLocation);

        if (this._infoList.length > 5) {
            let oldInfo = this._infoList.pop();
            this._removeLocationInternal(oldInfo);
        }
    }
});
