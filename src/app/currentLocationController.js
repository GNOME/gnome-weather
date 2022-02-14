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

import * as Util from '../misc/util.js';
export class CurrentLocationController {
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
            Geoclue.Simple.new_with_thresholds(pkg.name,
                                               Geoclue.AccuracyLevel.CITY,
                                               0, /* time threshold */
                                               100, /* distance threshold */
                                               null,
                                               (object, result) => {
                                                   this._onSimpleReady(object, result)
                                               });
        } else {
            Geoclue.Simple.new(pkg.name,
                               Geoclue.AccuracyLevel.CITY,
                               null,
                               (object, result) => {
                                   this._onSimpleReady(object, result)
                               });
        }
    }

    _geoLocationFailed(e) {
        log ("Failed to connect to GeoClue2 service: " + e.message);
        this.autoLocationAvailable = false;
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._world.currentLocationChanged(null);
        });
    }

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
            let client = this._simple.get_client();
            client.distance_threshold = 100;
        }

        this._findLocation();

        this.autoLocationAvailable = true;
    }

    _findLocation() {
        this._locationUpdatedId =
                    this._simple.connect("notify::location", (simple) => {
                        this._onLocationUpdated(simple);
                    });

        this._onLocationUpdated(this._simple);
    }

    _onLocationUpdated(simple) {
        let geoclueLocation = simple.get_location();

        this.currentLocation = GWeather.Location.get_world()
                                                .find_nearest_city(
                                                    geoclueLocation.latitude,
                                                    geoclueLocation.longitude
                                                );
        this._world.currentLocationChanged(this.currentLocation);
    }

    _autoLocationChanged(active) {
        if (active) {
            if (!this._processStarted) {
                this._startGeolocationService();
            } else {
                this._locationUpdatedId =
                    this._simple.connect("notify::location", (simple) => {
                                             this._onLocationUpdated(simple);
                                         });
            }
        } else {
            this._simple.disconnect(this._locationUpdatedId);
        }
    }
}
