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

import GLib from 'gi://GLib';
import GWeather from 'gi://GWeather';
import Geoclue from 'gi://Geoclue';
import Gio from 'gi://Gio';

import * as Util from '../misc/util.js';
import { WorldModel } from '../shared/world.js';
export class CurrentLocationController {
    /**
     * @param {WorldModel} world
     */
    constructor(world) {
        this._world = world;
        this._processStarted = false;
        this._settings = Util.getSettings('org.gnome.Weather');
      
        this.autoLocationAvailable = false;
        this._startGeolocationService();
        this.currentLocation = null;
    }

    _startGeolocationService() {
        this._processStarted = true;
        if (Geoclue.Simple.new_with_thresholds) {
            // @ts-expect-error pkg shenanigans
            Geoclue.Simple.new_with_thresholds(pkg.name,
                                               Geoclue.AccuracyLevel.CITY,
                                               0, /* time threshold */
                                               100, /* distance threshold */
                                               null,
                                               (object, result) => {
                                                   this._onSimpleReady(object, result)
                                               });
        } else {
            // @ts-expect-error pkg shenanigans
            Geoclue.Simple.new(pkg.name,
                               Geoclue.AccuracyLevel.CITY,
                               null,
                               (object, result) => {
                                   this._onSimpleReady(object, result)
                               });
        }
    }

    /**
     * @param {unknown} e
     */
    _geoLocationFailed(e) {
        if (e instanceof Error) {
            log ("Failed to connect to GeoClue2 service: " + e.message);
        }

        this.autoLocationAvailable = false;
        // @ts-expect-error What's going on here is unclear
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._world.currentLocationChanged(null);
        });
    }

    /**
     * @param {Geoclue.Simple | null} object
     * @param {Gio.AsyncResult} result
     */
    _onSimpleReady(object, result) {
        try {
            this._simple = Geoclue.Simple.new_finish(result);
        }
        catch (e) {
            this._geoLocationFailed(e);
            return;
        }

        // geoclue doesn't use a client proxy inside a flatpak sandbox
        if (this._simple.client && !Geoclue.Simple.new_with_thresholds) {
            this._simple.client.distance_threshold = 100;
        }

        this._findLocation();

        this.autoLocationAvailable = true;
    }

    _findLocation() {
        this._locationUpdatedId =
                    this._simple?.connect("notify::location", (simple) => {
                        this._onLocationUpdated(simple);
                    });

        this._onLocationUpdated(this._simple);
    }

    /**
     * @param {Geoclue.Simple | undefined} simple
     */
    _onLocationUpdated(simple) {
        this.currentLocation = null;
        let geoclueLocation = simple?.get_location();
        let world = GWeather.Location.get_world();

        if (geoclueLocation && world) {
            this.currentLocation = world.find_nearest_city(geoclueLocation.latitude, geoclueLocation.longitude);
        }

        this._world.currentLocationChanged(this.currentLocation);
    }
}
