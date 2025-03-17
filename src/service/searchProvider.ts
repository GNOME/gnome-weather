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
import { WeatherBackgroundService } from './main.js';
import { WorldModel } from 'src/shared/world.js';

type ResultMeta = {
    name: GLib.Variant<'s'>
    id: GLib.Variant<'s'>,
    description: GLib.Variant<'s'>,
    icon: GLib.Variant<'(sv)'> | null,
}

const SearchProviderInterface = new TextDecoder().decode(
    Gio.resources_lookup_data('/org/gnome/shell/ShellSearchProvider2.xml', 0).get_data() ?? undefined
);

function getCountryName(location: GWeather.Location): string | null {
    let base: GWeather.Location | null = location;
    while (base &&
        base.get_level() > GWeather.LocationLevel.COUNTRY)
        base = base.get_parent();

    return base?.get_name() ?? null;
}

export class WeatherSearchProvider {
    _app: WeatherBackgroundService;
    _impl: Gio.DBusExportedObject;

    constructor(application: WeatherBackgroundService) {
        this._app = application;

        this._impl = Gio.DBusExportedObject.wrapJSObject(SearchProviderInterface, this);
    }

    export(connection: Gio.DBusConnection, path: string): void {
        return this._impl.export(connection, path);
    }

    unexport(connection: Gio.DBusConnection): void {
        return this._impl.unexport_from_connection(connection);
    }

    GetInitialResultSetAsync(params: [string[], string[]], invocation: Gio.DBusMethodInvocation): void {
        this._app.hold();

        const terms = params[0];
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const model = this._app.model!;

        if (model?.loading) {
            const notifyId = model.connect('notify::loading', (model: WorldModel) => {
                if (!model.loading) {
                    model.disconnect(notifyId);
                    this._runQuery(terms, invocation);
                }
            });
        } else {
            this._runQuery(terms, invocation);
        }
    }

    _runQuery(terms: string[], invocation: Gio.DBusMethodInvocation): void {
        const nameRet = [];
        const cityRet = [];
        const countryRet = [];

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const model = this._app.model!;

        let index = 0;
        for (const info of model.getAll()) {
            const location = info.location;

            const name = Util.normalizeCasefoldAndUnaccent(location.get_name());
            const city = Util.normalizeCasefoldAndUnaccent(location.get_city_name());
            const country = Util.normalizeCasefoldAndUnaccent(getCountryName(location));

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
                const path = index.toString();

                if (nameMatch)
                    nameRet.push(path);
                else if (cityMatch)
                    cityRet.push(path);
                else if (countryMatch)
                    countryRet.push(path);
            }

            index++;
        }

        this._app.release();

        const result = nameRet.concat(cityRet).concat(countryRet);
        invocation.return_value(new GLib.Variant('(as)', [result]));
    }

    GetSubsearchResultSet(previous: string[], terms: string[]): string[] {
        this._app.hold();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const model = this._app.model!;
        const ret = [];

        for (let i = 0; i < previous.length; i++) {
            const info = model.getAtIndex(parseInt(previous[i]));
            if (!info)
                continue;

            const location = info.location;
            const name = Util.normalizeCasefoldAndUnaccent(location.get_name());
            const city = Util.normalizeCasefoldAndUnaccent(location.get_city_name());
            const country = Util.normalizeCasefoldAndUnaccent(getCountryName(location));
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

    GetResultMetas(identifiers: string[]): ResultMeta[] {
        this._app.hold();

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const model = this._app.model!;
        const ret = [];

        for (let i = 0; i < identifiers.length; i++) {
            const info = model.getAtIndex(parseInt(identifiers[i]));
            if (!info)
                continue;

            const location = info.location;
            const name = location.get_city_name();
            const conditions = Util.getWeatherConditions(info);

            /* TRANSLATORS: this is the description shown in the overview search
               It's the current weather conditions followed by the temperature,
               like "Clear sky, 14 °C" */
            const summary = _("%s, %s").format(conditions, info.get_temp());
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

    _getPlatformData(timestamp: number): Record<string, GLib.Variant> {
        return { 'desktop-startup-id': new GLib.Variant('s', '_TIME' + timestamp) };
    }

    _activateAction(action: string, parameter: GLib.Variant<"s"> | GLib.Variant<"v">, timestamp: number): void {
        let wrappedParam: (GLib.Variant<"s"> | GLib.Variant<"v">)[] = [];
        if (parameter)
            wrappedParam = [parameter];

        const profile = '';

        Gio.DBus.session.call(pkg.name ?? null,
            '/org/gnome/Weather' + profile,
            'org.freedesktop.Application',
            'ActivateAction',
            new GLib.Variant('(sava{sv})', [action, wrappedParam,
                this._getPlatformData(timestamp)]),
            null,
            Gio.DBusCallFlags.NONE,
            -1, null, (connection, result) => {
                try {
                    connection?.call_finish(result);
                } catch (e) {
                    if (e instanceof GLib.Error) {
                        log('Failed to launch application: ' + e.message);
                    }
                }

                this._app.release();
            });
    }

    ActivateResult(id: string, _terms: string[], timestamp: number): void {
        this._app.hold();

        //log('Activating ' + id);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const model = this._app.model!;
        const info = model.getAtIndex(parseInt(id));
        if (!info) {
            this._app.release();
            return;
        }

        //log('Activating ' + info.get_location_name());

        const location = info.location.serialize();
        this._activateAction('show-location', new GLib.Variant('v', location), timestamp);
    }

    LaunchSearch(terms: string[], timestamp: number): void {
        this._app.hold();

        this._activateAction('show-search', new GLib.Variant('s', terms.join(' ')), timestamp);
    }
}
