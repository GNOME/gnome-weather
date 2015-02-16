// -*- Mode: js; indent-tabs-mode: nil; c-basic-offset: 4; tab-width: 4 -*-
//
// Copyright (c) 2014 Saurabh Patel <srp201201051@gmail.com>
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
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const GWeather = imports.gi.GWeather;

const Util = imports.misc.util;

const ManagerInterface = '<node> \
<interface name="org.freedesktop.GeoClue2.Manager"> \
    <method name="GetClient"> \
        <arg name="client" type="o" direction="out"/> \
    </method> \
</interface> \
</node>';
const ManagerProxy = Gio.DBusProxy.makeProxyWrapper(ManagerInterface);

const ClientInterface = '<node> \
<interface name="org.freedesktop.GeoClue2.Client"> \
    <property name="Location" type="o" access="read"/> \
    <property name="DesktopId" type="s" access="readwrite"/> \
    <property name="RequestedAccuracyLevel" type="u" access="readwrite"/> \
    <property name="DistanceThreshold" type="u" access="readwrite"/> \
    <method name="Start"/> \
    <signal name="LocationUpdated"> \
        <arg name="old" type="o"/> \
        <arg name="new" type="o"/> \
    </signal> \
</interface> \
</node>';
const ClientProxy = Gio.DBusProxy.makeProxyWrapper(ClientInterface);

const AccuracyLevel = {
    COUNTRY: 1,
    CITY: 4,
    NEIGHBORHOOD: 5,
    STREET: 6,
    EXACT: 8,
};

const LocationInterface = '<node> \
<interface name="org.freedesktop.GeoClue2.Location"> \
    <property name="Latitude" type="d" access="read"/> \
    <property name="Longitude" type="d" access="read"/> \
    <property name="Accuracy" type="d" access="read"/> \
    <property name="Description" type="s" access="read"/> \
</interface> \
</node>';
const LocationProxy = Gio.DBusProxy.makeProxyWrapper(LocationInterface);

const CurrentLocationController = new Lang.Class({
    Name: 'CurrentLocationController',

    _init: function(world) {
        this._world = world;
        this._processStarted = false;
        this._settings = Util.getSettings('org.gnome.Weather.Application');
        this.autoLocation = this._settings.get_value('automatic-location').deep_unpack();
        if(this.autoLocation)
            this._startGeolocationService();
        this.currentLocation = null;
    },

    _startGeolocationService: function() {
        this._processStarted = true;
        try {
            this._managerProxy = new ManagerProxy(Gio.DBus.system,
                                                  "org.freedesktop.GeoClue2",
                                                  "/org/freedesktop/GeoClue2/Manager");

            this._managerProxy.GetClientRemote(this._onGetClientReady.bind(this));
        } catch(e) {
            this._geoLocationFailed(e);
        }
    },

    _geoLocationFailed: function(e) {
        log ("Failed to connect to GeoClue2 service: " + e.message);
        GLib.idle_add(GLib.PRIORITY_DEFAULT, Lang.bind(this, function() {
            this._world.currentLocationChanged(null);
        }));
    },

    _onGetClientReady: function(result, e) {
        if (e) {
            this._geoLocationFailed(e);
            return;
        }

        let [clientPath] = result;

        this._clientProxy = new ClientProxy(Gio.DBus.system,
                                            "org.freedesktop.GeoClue2",
                                            clientPath);
        this._clientProxy.DesktopId = pkg.name;
        this._clientProxy.RequestedAccuracyLevel = AccuracyLevel.CITY;
        this._clientProxy.DistanceThreshold = 100;

        this._findLocation();
    },

    _findLocation: function() {
        this._locationUpdatedId =
            this._clientProxy.connectSignal("LocationUpdated",
                                            this._getCurrentLocation.bind(this));

        this._clientProxy.StartRemote(Lang.bind(this, function(result, e) {
            if (e) {
                log ("Failed to connect to GeoClue2 service: " + e.message);
                this._world.currentLocationChanged(null);
            }
        }));
    },

    _getCurrentLocation: function(proxy, sender, [oldPath, newPath]) {
        let geoclueLocation = new LocationProxy(Gio.DBus.system,
                                                "org.freedesktop.GeoClue2",
                                                newPath);

        this.currentLocation = GWeather.Location.new_detached(geoclueLocation.Description,
                                                              null,
                                                              geoclueLocation.Latitude,
                                                              geoclueLocation.Longitude);
        this._world.currentLocationChanged(this.currentLocation);
    },

    setAutoLocation: function(active) {
        this._settings.set_value('automatic-location', new GLib.Variant('b', active));
        this._autoLocationChanged(active);
    },

    _autoLocationChanged: function(active) {
        if (active) {
            if (!this._processStarted) {
                this._startGeolocationService();
            } else {
                this._locationUpdatedId =
                    this._clientProxy.connectSignal("LocationUpdated",
                                                    Lang.bind(this, this._getCurrentLocation));
            }
        } else {
            this._clientProxy.disconnectSignal(this._locationUpdatedId);
        }
    }
});
