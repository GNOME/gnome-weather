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

const Util = imports.util;

const Columns = {
    ID: Gd.MainColumns.ID,
    URI: Gd.MainColumns.URI,
    PRIMARY_TEXT: Gd.MainColumns.PRIMARY_TEXT,
    SECONDARY_TEXT: Gd.MainColumns.SECONDARY_TEXT,
    ICON: Gd.MainColumns.ICON,
    MTIME: Gd.MainColumns.MTIME,
    SELECTED: Gd.MainColumns.SELECTED,
    LOCATION: 7,
    INFO: 8
};

const ICON_SIZE = 128;

const WorldModel = new Lang.Class({
    Name: 'WorldModel',
    Extends: Gtk.ListStore,
    Signals: {
        'updated': { param_types: [ GWeather.Info ] }
    },

    _init: function(world) {
        this.parent();
        this.set_column_types([GObject.TYPE_STRING,
                               GObject.TYPE_STRING,
                               GObject.TYPE_STRING,
                               GObject.TYPE_STRING,
                               GdkPixbuf.Pixbuf,
                               GObject.TYPE_INT,
                               GObject.TYPE_BOOLEAN,
                               GWeather.Location,
                               GWeather.Info]);

        this._world = world;

        this._settings = Util.getSettings('org.gnome.Weather.Application');

        let locations = this._settings.get_value('locations').deep_unpack();
        for (let i = 0; i < locations.length; i++) {
            let variant = locations[i];
            let location = this._world.deserialize(variant);
            this._addLocationInternal(location);
        }

        this._settings.connect('changed::locations', Lang.bind(this, this._onChanged));
    },

    _addLocationInternal: function(location) {
        let info = new GWeather.Info({ world: this._world,
                                       location: location,
                                       forecast_type: GWeather.ForecastType.LIST,
                                       enabled_providers: (GWeather.Provider.METAR |
                                                           GWeather.Provider.YR_NO) });
        let iter;
        info.connect('updated', Lang.bind(this, function(info) {
            let icon = Util.loadIcon(info.get_symbolic_icon_name(), ICON_SIZE);
            let secondary_text = Util.getWeatherConditions(info);
            this.set(iter,
                     [Columns.ICON, Columns.SECONDARY_TEXT],
                     [icon, secondary_text]);

            this.emit('updated', info);
        }));
        info.update();

        let primary_text = location.get_city_name();
        let icon = Util.loadIcon('view-refresh-symbolic', ICON_SIZE);

        iter = this.insert_with_valuesv(-1,
                                        [Columns.PRIMARY_TEXT,
                                         Columns.ICON,
                                         Columns.LOCATION,
                                         Columns.INFO],
                                        [primary_text,
                                         icon,
                                         location,
                                         info]);
    },

    _onChanged: function() {
        let newLocations = this._settings.get_value('locations').deep_unpack();
        let toErase = [];

        let [ok, iter] = this.get_iter_first();
        while (ok) {
            let location = this.get_value(iter, Columns.LOCATION);

            let found = true;
            for (let j = 0; j < newLocations.length; j++) {
                let variant = newLocations[j];
                if (variant == null)
                    continue;

                let newLocation = this._world.deserialize(variant);

                if (location.equal(newLocation)) {
                    newLocations[j] = null;
                    found = true;
                    break;
                }
            }

            if (!found)
                toErase.push(iter.copy());

            ok = this.iter_next(iter);
        }

        for (let i = 0; i < toErase.length; i++)
            this.erase(toErase[i]);

        for (let i = 0; i < newLocations.length; i++) {
            let variant = newLocations[i];
            if (variant == null)
                continue;

            let newLocation = this._world.deserialize(variant);
            this._addLocationInternal(newLocation);
        }
    },

    addLocation: function(location) {
        let newLocations = this._settings.get_value('locations').deep_unpack();
        newLocations.push(location.serialize());
        this._settings.set_value('locations', new GLib.Variant('av', newLocations));
    },

    removeLocation: function(iter) {
        let location = this.get_value(iter, Columns.LOCATION);
        let variant = location.serialize();

        let newLocations = this._settings.get_value('locations').deep_unpack();
        for (let i = 0; i < newLocations.length; i++) {
            if (newLocations[i].equal(variant)) {
                newLocations.splice(i, 1);
                break;
            }
        }
        this._settings.set_value('locations', new GLib.Variant('av', newLocations));
    },
});
