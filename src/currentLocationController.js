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
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const GWeather = imports.gi.GWeather;
const Geocode = imports.gi.GeocodeGlib;

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

    _init: function(callback) {
        this._callback = callback;
        this._managerProxy = new ManagerProxy(Gio.DBus.system,
                                               "org.freedesktop.GeoClue2",
                                               "/org/freedesktop/GeoClue2/Manager");

        this._managerProxy.GetClientRemote(this._onGetClientReady.bind(this));
    },

    _onGetClientReady: function(result, e) {
        if (e) {
            log ("Failed to connect to GeoClue2 service: " + e.message);
            return;
        }

        let [clientPath] = result;

        this._clientProxy = new ClientProxy(Gio.DBus.system,
                                            "org.freedesktop.GeoClue2",
                                            clientPath);
        this._clientProxy.DesktopId = "gnome-weather";
        this._clientProxy.RequestedAccuracyLevel = AccuracyLevel.CITY;
        this._clientProxy.DistanceThreshold = 100;

        this._findLocation();
    },

    _findLocation: function() {
        this._locationUpdatedId =
            this._clientProxy.connectSignal("LocationUpdated",
                                            this._getCurrentLocation.bind(this));

        this._clientProxy.StartRemote(function(result, e) {
            if (e) {
                log ("Failed to connect to GeoClue2 service: " + e.message);
            }
        });
    },

    _getCurrentLocation: function(proxy, sender, [oldPath, newPath]) {
        let geoclueLocation = new LocationProxy(Gio.DBus.system,
                                                "org.freedesktop.GeoClue2",
                                                newPath);
        let location = new Geocode.Location({ latitude: geoclueLocation.Latitude,
                                              longitude: geoclueLocation.Longitude,
                                              accuracy: geoclueLocation.Accuracy,
                                              description: geoclueLocation.Description });

        this.currentLocation = GWeather.Location.get_world().find_nearest_city (location.latitude, location.longitude);
        if (this.currentLocation)
            this._callback(this.currentLocation);
    },

    isLocationSimilar: function(location) {
        if (this.currentLocation != null) {
            let station_code = location.get_code ();
            let currentLocationCode = this.currentLocation.get_code();

            if (station_code && currentLocationCode && (station_code == currentLocationCode)) {
                let name = location.get_name ();
                let currentLocationName = this.currentLocation.get_name();

                if (name && currentLocationName && (name == currentLocationName)) {
                    return true;
                }
            }
        }

        return false;
    }
});
