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

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GWeather from 'gi://GWeather';

import * as Util from '../misc/util.js';


const SearchProviderInterface = new TextDecoder().decode(
    Gio.resources_lookup_data('/org/gnome/shell/ShellSearchProvider2.xml', 0).get_data()
);

function getCountryName(location) {
    while (location &&
        location.get_level() > GWeather.LocationLevel.COUNTRY)
        location = location.get_parent();

    return location.get_name();
}

export class WeatherSearchProvider {
    constructor(application) {
        this._app = application;

        this._impl = Gio.DBusExportedObject.wrapJSObject(SearchProviderInterface, this);
    }

    export(connection, path) {
        return this._impl.export(connection, path);
    }

    unexport(connection) {
        return this._impl.unexport_from_connection(connection);
    }

    GetInitialResultSetAsync(params, invocation) {
        this._app.hold();

        let terms = params[0];
        let model = this._app.model;

        if (model.loading) {
            let notifyId = model.connect('notify::loading', (model) => {
                if (!model.loading) {
                    model.disconnect(notifyId);
                    this._runQuery(terms, invocation);
                }
            });
        } else {
            this._runQuery(terms, invocation);
        }
    }

    _runQuery(terms, invocation) {
        let nameRet = [];
        let cityRet = [];
        let countryRet = [];

        let model = this._app.model;

        let index = 0;
        for (let info of model.getAll()) {
            let location = info.location;

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
                let path = index.toString();

                if (nameMatch)
                    nameRet.push(path);
                else if (cityMatch)
                    cityRet.push(path);
                else
                    countryRet.push(path);
            }

            index++;
        }

        this._app.release();

        let result = nameRet.concat(cityRet).concat(countryRet);
        invocation.return_value(new GLib.Variant('(as)', [result]));
    }

    GetSubsearchResultSet(previous, terms) {
        this._app.hold();

        let model = this._app.model;
        let ret = [];

        for (let i = 0; i < previous.length; i++) {
            let info = model.getAtIndex(parseInt(previous[i]));
            if (!info)
                continue;

            let location = info.location;
            let name = Util.normalizeCasefoldAndUnaccent(location.get_name());
            let city = Util.normalizeCasefoldAndUnaccent(location.get_city_name());
            let country = Util.normalizeCasefoldAndUnaccent(getCountryName(location));
            let good = true;

            for (let j = 0; j < terms.length && good; j++) {
                terms[j] = Util.normalizeCasefoldAndUnaccent(terms[j]);

                good = (name.indexOf(terms[j]) >= 0) ||
                    (city.indexOf(terms[j]) >= 0) ||
                    (country.indexOf(terms[j]) >= 0);

                //log ('Comparing %s against (%s, %s, %s): %s'.format(terms[i],
                //                                                    name, city, country, good));
            }

            if (good)
                ret.push(previous[i]);
        }

        this._app.release();

        return ret;
    }

    GetResultMetas(identifiers) {
        this._app.hold();

        let model = this._app.model;
        let ret = [];

        for (let i = 0; i < identifiers.length; i++) {
            let info = model.getAtIndex(parseInt(identifiers[i]));
            if (!info)
                continue;

            let location = info.location;
            let name = location.get_city_name();
            let conditions = Util.getWeatherConditions(info);

            /* TRANSLATORS: this is the description shown in the overview search
               It's the current weather conditions followed by the temperature,
               like "Clear sky, 14 °C" */
            let summary = _("%s, %s").format(conditions, info.get_temp());
            ret.push({
                name: new GLib.Variant('s', name),
                id: new GLib.Variant('s', identifiers[i]),
                description: new GLib.Variant('s', summary),
                icon: (new Gio.ThemedIcon({ name: info.get_icon_name() })).serialize()
            });
        }

        this._app.release();

        return ret;
    }

    _getPlatformData(timestamp) {
        return { 'desktop-startup-id': new GLib.Variant('s', '_TIME' + timestamp) };
    }

    _activateAction(action, parameter, timestamp) {
        let wrappedParam;
        if (parameter)
            wrappedParam = [parameter];
        else
            wrappedParam = [];

        profile = '';

        Gio.DBus.session.call(pkg.name,
            '/org/gnome/Weather' + profile,
            'org.freedesktop.Application',
            'ActivateAction',
            new GLib.Variant('(sava{sv})', [action, wrappedParam,
                this._getPlatformData(timestamp)]),
            null,
            Gio.DBusCallFlags.NONE,
            -1, null, (connection, result) => {
                try {
                    connection.call_finish(result);
                } catch (e) {
                    log('Failed to launch application: ' + e);
                }

                this._app.release();
            });
    }

    ActivateResult(id, terms, timestamp) {
        this._app.hold();

        //log('Activating ' + id);

        let model = this._app.model;
        let info = model.getAtIndex(parseInt(id));
        if (!info) {
            this._app.release();
            return;
        }

        //log('Activating ' + info.get_location_name());

        let location = info.location.serialize();
        this._activateAction('show-location', new GLib.Variant('v', location), timestamp);
    }

    LaunchSearch(terms, timestamp) {
        this._app.hold();

        this._activateAction('show-search', new GLib.Variant('s', terms.join(' ')), timestamp);
    }
}
