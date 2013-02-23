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

const Strings = imports.strings;
const Util = imports.util;

// In microseconds
const ONE_DAY = 24*3600*1000*1000;
const SIX_HOURS = 6*3600*1000*1000;

const ForecastBox = new Lang.Class({
    Name: 'ForecastBox',
    Extends: Gtk.Grid,

    _init: function(params) {
        params = Params.fill({ orientation: Gtk.Orientation.HORIZONTAL,
                               column_spacing: 24,
                               column_homogeneous: true });
        this.parent(params);
    },

    update: function(infos) {
        let dates = infos.map(function(i) {
            let [ok, date] = i.get_value_update();
            return GLib.DateTime.new_from_unix_local(date);
        });

        let subday = this._hasSubdayResolution(dates);

        let current;
        let n = 0;
        // limit to 5 infos max
        for (let i = 0; i < dates.length && n < 5; i++) {
            let info = infos[i];

            // only show forecasts if they're separated by
            // at least 6 hours
            let [ok, date] = info.get_value_update();
            let datetime = GLib.DateTime.new_from_unix_local(date);
            if (current && datetime.difference(current) < SIX_HOURS)
                continue;

            let text = '<b>' + this._getDate(datetime, subday) + '</b>';
            let label = new Gtk.Label({ label: text,
                                        use_markup: true,
                                        visible: true });
            this.attach(label, n, 0, 1, 1);

            let image = new Gtk.Image({ icon_name: info.get_icon_name(),
                                        icon_size: Gtk.IconSize.DIALOG,
                                        visible: true });
            this.attach(image, n, 1, 1, 1);

            let temperature = new Gtk.Label({ label: this._getTemperature(info),
                                              visible: true });
            this.attach(temperature, n, 2, 1, 1);

            current = datetime;
            n++;
        }
    },

    clear: function() {
        this.foreach(function(w) { w.destroy(); });
    },

    _hasSubdayResolution: function(dates) {
        if (dates.length == 1)
            return false;

        if (dates[1].difference(dates[0]) < ONE_DAY)
            return true;
        else
            return false;
    },

    _getDate: function(datetime, subday) {
        let now = GLib.DateTime.new_now_local();
        let tomorrow = now.add_days(1);

        if (Util.arrayEqual(now.get_ymd(),
                            datetime.get_ymd())) {
            if (subday)
                return Strings.formatToday(datetime);
            else
                return _("Today");
        } else if (Util.arrayEqual(tomorrow.get_ymd(),
                                   datetime.get_ymd())) {
            if (subday)
                return Strings.formatTomorrow(datetime);
            else
                return _("Tomorrow");
        } else {
            if (subday)
                return Strings.formatDayPart(datetime);
            else
                return datetime.format('%A');
        }
    },

    _getTemperature: function(info) {
        let [ok1, ] = info.get_value_temp_min(GWeather.TemperatureUnit.DEFAULT);
        let [ok2, ] = info.get_value_temp_max(GWeather.TemperatureUnit.DEFAULT);

        if (ok1 && ok2)
            return _("%s / %s").format(info.get_temp_min(), info.get_temp_max());
        else
            return info.get_temp_summary();
    }
});

