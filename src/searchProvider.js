// -*- Mode: js; indent-tabs-mode: nil; c-basic-offset: 4; tab-width: 4 -*-
//
// Copyright (c) 2013 Giovanni Campagna <scampa.giovanni@gmail.com>
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
const Window = imports.window;
const World = imports.world;

const SearchProviderInterface = Gio.resources_lookup_data('/org/gnome/shell/ShellSearchProvider2.xml', 0).toArray().toString();

function getCountryName(location) {
    while (location &&
           location.get_level() > GWeather.LocationLevel.COUNTRY)
        location = location.get_parent();

    return location.get_name();
}

const SearchProvider = new Lang.Class({
    Name: 'WeatherSearchProvider',

    _init: function(application) {
        this._app = application;

        this._impl = Gio.DBusExportedObject.wrapJSObject(SearchProviderInterface, this);
    },

    export: function(connection, path) {
        return this._impl.export(connection, path);
    },

    unexport: function(connection) {
        return this._impl.unexport_from_connection(connection);
    },

    GetInitialResultSet: function(terms) {
        this._app.hold();

        let model = this._app.model;
        let nameRet = [];
        let cityRet = [];
        let countryRet = [];

        let [ok, iter] = model.get_iter_first();
        while (ok) {
            let location = model.get_value(iter, World.Columns.LOCATION);

            let name = Util.normalizeCasefoldAndUnaccent(location.get_name());
            let city = Util.normalizeCasefoldAndUnaccent(location.get_city_name());
            let country = Util.normalizeCasefoldAndUnaccent(getCountryName(location));

            let nameMatch = false;
            let cityMatch = false;
            let countryMatch = false;
            let good = true;
            for (let i = 0; i < terms.length && good; i++) {
                terms[i] = Util.normalizeCasefoldAndUnaccent(terms[i]);

                if (name.indexOf(terms[i]) >= 0) {
                    nameMatch = true;
                } else if (city.indexOf(terms[i]) >= 0) {
                    cityMatch = true;
                } else if (country.indexOf(terms[i]) >= 0) {
                    countryMatch = true;
                } else {
                    good = false;
                }

                //log ('Comparing %s against (%s, %s, %s): %s'.format(terms[i],
                //                                                    name, city, country, good));
            }

            if (good) {
                let path = model.get_path(iter).to_string();

                if (nameMatch)
                    nameRet.push(path);
                else if (cityMatch)
                    cityRet.push(path);
                else
                    countryRet.push(path);
            }

            ok = model.iter_next(iter);
        }

        this._app.release();

        return nameRet.concat(cityRet).concat(countryRet);
    },

    GetSubsearchResultSet: function(previous, terms) {
        this._app.hold();

        let model = this._app.model;
        let ret = [];

        for (let i = 0; i < previous.length; i++) {
            let [ok, iter] = model.get_iter_from_string(previous[i]);

            if (!ok)
                continue;

            let location = model.get_value(iter, World.Columns.LOCATION);

            let name = Util.normalizeCasefoldAndUnaccent(location.get_name());
            let city = Util.normalizeCasefoldAndUnaccent(location.get_city_name());
            let country = Util.normalizeCasefoldAndUnaccent(getCountryName(location));
            let good = true;
            for (let j = 0; j < terms.length && good; j++) {
                terms[i] = Util.normalizeCasefoldAndUnaccent(terms[j]);

                good = (name.indexOf(terms[i]) >= 0) ||
                    (city.indexOf(terms[i]) >= 0) ||
                    (country.indexOf(terms[i]) >= 0);

                //log ('Comparing %s against (%s, %s, %s): %s'.format(terms[i],
                //                                                    name, city, country, good));
            }

            if (good)
                ret.push(previous[i]);
        }

        this._app.release();

        return ret;
    },

    GetResultMetas: function(identifiers) {
        this._app.hold();

        let model = this._app.model;
        let ret = [];

        for (let i = 0; i < identifiers.length; i++) {
            let [ok, iter] = model.get_iter_from_string(identifiers[i]);

            if (!ok)
                continue;

            let location = model.get_value(iter, World.Columns.LOCATION);
            let info = model.get_value(iter, World.Columns.INFO);
            let name = model.get_value(iter, World.Columns.PRIMARY_TEXT);
            let conditions = model.get_value(iter, World.Columns.SECONDARY_TEXT);

            // TRANSLATORS: this is the description shown in the overview search
            // It's the current weather conditions followed by the temperature,
            // like "Clear sky, 14 °C"
            let summary = _("%s, %s").format(conditions, info.get_temp());
            ret.push({ name: new GLib.Variant('s', name),
                       id: new GLib.Variant('s', identifiers[i]),
                       description: new GLib.Variant('s', summary),
                       icon: (new Gio.ThemedIcon({ name: info.get_icon_name() })).serialize()
                     });
        }

        this._app.release();

        return ret;
    },

    ActivateResult: function(id, terms, timestamp) {
        this._app.hold();

        let model = this._app.model;
        let [ok, iter] = model.get_iter_from_string(id);
        if (!ok)
            return;

        let info = model.get_value(iter, World.Columns.INFO);
        let win = new Window.MainWindow({ application: this._app });

        win.showInfo(info);
        win.present_with_time(timestamp);

        this._app.release();
    }
});
