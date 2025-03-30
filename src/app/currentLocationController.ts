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

import {WorldModel} from '../shared/world.js';

export class CurrentLocationController {
    private world: WorldModel;
    private simple?: Geoclue.Simple;

    private currentLocation?: GWeather.Location;

    public constructor(world: WorldModel) {
        this.world = world;

        this.startGeolocationService();
    }

    private startGeolocationService(): void {
        if (Geoclue.Simple.new_with_thresholds) {
            Geoclue.Simple.new_with_thresholds(
                pkg.name,
                Geoclue.AccuracyLevel.CITY,
                0 /* time threshold */,
                100 /* distance threshold */,
                null,
                (_, result) => {
                    this.onSimpleReady(result);
                }
            );
        } else {
            Geoclue.Simple.new(
                pkg.name,
                Geoclue.AccuracyLevel.CITY,
                null,
                (_, result) => {
                    this.onSimpleReady(result);
                }
            );
        }
    }

    private geoLocationFailed(e: unknown): void {
        if (e instanceof Error) {
            log('Failed to connect to GeoClue2 service: ' + e.message);
        }

        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this.world.currentLocationChanged(undefined);
            return GLib.SOURCE_REMOVE;
        });
    }

    private onSimpleReady(result: Gio.AsyncResult): void {
        try {
            this.simple = Geoclue.Simple.new_finish(result);
        } catch (e) {
            this.geoLocationFailed(e);
            return;
        }

        // geoclue doesn't use a client proxy inside a flatpak sandbox
        if (this.simple.client && !Geoclue.Simple.new_with_thresholds) {
            this.simple.client.distance_threshold = 100;
        }

        this.findLocation();
    }

    private findLocation(): void {
        this.simple?.connect('notify::location', (simple: Geoclue.Simple) => {
            this.onLocationUpdated(simple);
        });

        this.onLocationUpdated(this.simple);
    }

    private onLocationUpdated(simple?: Geoclue.Simple): void {
        this.currentLocation = undefined;
        const geoclueLocation = simple?.get_location();
        const world = GWeather.Location.get_world();

        if (geoclueLocation && world) {
            this.currentLocation = world.find_nearest_city(
                geoclueLocation.latitude,
                geoclueLocation.longitude
            );
        }

        this.world.currentLocationChanged(this.currentLocation);
    }
}
