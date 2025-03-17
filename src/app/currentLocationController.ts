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
    _world: WorldModel;
    _processStarted: boolean;
    _settings: Gio.Settings;
    _simple?: Geoclue.Simple;

    autoLocationAvailable: boolean;
    currentLocation?: GWeather.Location;
    _locationUpdatedId?: number;

    constructor(world: WorldModel) {
        this._world = world;
        this._processStarted = false;
        this._settings = Util.getSettings('org.gnome.Weather');

        this.autoLocationAvailable = false;
        this._startGeolocationService();
    }

    _startGeolocationService(): void {
        this._processStarted = true;
        if (Geoclue.Simple.new_with_thresholds) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            Geoclue.Simple.new_with_thresholds(pkg.name!,
                                               Geoclue.AccuracyLevel.CITY,
                                               0, /* time threshold */
                                               100, /* distance threshold */
                                               null,
                                               (_, result) => {
                                                   this._onSimpleReady(result)
                                               });
        } else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            Geoclue.Simple.new(pkg.name!,
                               Geoclue.AccuracyLevel.CITY,
                               null,
                               (_, result) => {
                                   this._onSimpleReady(result)
                               });
        }
    }

    _geoLocationFailed(e: unknown): void {
        if (e instanceof Error) {
            log ("Failed to connect to GeoClue2 service: " + e.message);
        }

        this.autoLocationAvailable = false;
        // @ts-expect-error What's going on here is unclear
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._world.currentLocationChanged(undefined);
        });
    }

    _onSimpleReady(result: Gio.AsyncResult): void {
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

    _findLocation(): void {
        this._locationUpdatedId =
                    this._simple?.connect("notify::location", (simple: Geoclue.Simple) => {
                        this._onLocationUpdated(simple);
                    });

        this._onLocationUpdated(this._simple);
    }

    _onLocationUpdated(simple?: Geoclue.Simple): void {
        this.currentLocation = undefined;
        const geoclueLocation = simple?.get_location();
        const world = GWeather.Location.get_world();

        if (geoclueLocation && world) {
            this.currentLocation = world.find_nearest_city(geoclueLocation.latitude, geoclueLocation.longitude);
        }

        this._world.currentLocationChanged(this.currentLocation);
    }
}
