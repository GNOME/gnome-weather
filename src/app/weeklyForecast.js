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

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Util = imports.misc.util;

var WeeklyForecastFrame = GObject.registerClass(class WeeklyForecastFrame extends Gtk.Frame {

    _init(params) {
        super._init(Object.assign({
            shadow_type: Gtk.ShadowType.IN,
            name: 'weekly-forecast-frame',
            width_request: 150
        }, params));
        this.get_accessible().accessible_name = _("Weekly Forecast");

        this._settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });

        this._box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL,
                                  spacing: 0});
        this.add(this._box);
    }

    // get infos for the correct day
    _preprocess(infos, day) {
        let ret = [];
        let i;

        // look for 14:00 of the given day
        // (14:00 is chosen because usually it's the highest temperature
        // in the day, so it makes sense as a temperature value)
        day = GLib.DateTime.new_local(day.get_year(),
                                      day.get_month(),
                                      day.get_day_of_month(),
                                      14, 0, 0);

        // First ignore all infos that are on a different
        // older than day.
        // infos are ordered by time, and it's assumed at some point
        // there is an info for the day (otherwise, nothing
        // is shown)
        for (i = 0; i < infos.length; i++) {
            let info = infos[i];

            let [ok, date] = info.get_value_update();
            let datetime = GLib.DateTime.new_from_unix_local(date);

            if (Util.arrayEqual(day.get_ymd(), datetime.get_ymd())) {
                break;
            }
        }

        let infoCount = 0;
        while (i < infos.length && infoCount < 5) {
            let count = 0;
            let best = null;
            let diff = 0;

            for ( ; i < infos.length; i++) {
                let info = infos[i];
                let [ok, date] = info.get_value_update();
                let datetime = GLib.DateTime.new_from_unix_local(date);

                if (!Util.arrayEqual(day.get_ymd(),
                                     datetime.get_ymd()))
                    break;

                let v = Math.abs(datetime.difference(day));
                if (best == null || v < diff) {
                    best = info;
                    diff = v;
                }
            }
            if (best)
                ret.push(best);
            day = day.add_days(1);
            infoCount++;
        }
        return ret;
    }

    update(infos) {
        let day = GLib.DateTime.new_now_local();
        day = day.add_days(1);

        let weeklyInfo = this._preprocess(infos, day);
        this.clear();

        for (let i = 0; i < weeklyInfo.length; i++) {
            let info = weeklyInfo[i];
            let [ok, date] = info.get_value_update();
            let datetime = GLib.DateTime.new_from_unix_local(date);

            let dayEntry = new DayEntry();

            /* Translators: this is the time format for weekday name according to the current locale */
            let nameFormat = _("%a");
            dayEntry.nameLabel.label = datetime.format(nameFormat);

            /* Translators: this is the time format for day and month name according to the current locale */
            let dateFormat = _("%e %b");
            dayEntry.dateLabel.label = datetime.format(dateFormat);

            dayEntry.image.iconName = info.get_symbolic_icon_name();
            dayEntry.temperatureLabel.label = Util.getTemperature(info);

            this._box.pack_start(dayEntry, false, false, 0);

            if (i < weeklyInfo.length - 1) {
                let separator = new Gtk.Separator({ orientation: Gtk.Orientation.VERTICAL,
                                                    visible: true});
                this._box.pack_start(separator, false, false, 0);
            }
        }
    }

    clear() {
        this._box.foreach(function(w) { w.destroy(); });
    }
});

var DayEntry = GObject.registerClass({
    Template: 'resource:///org/gnome/Weather/day-entry.ui',
    InternalChildren: ['nameLabel', 'dateLabel', 'image', 'temperatureLabel'],
}, class DayEntry extends Gtk.Box {

    _init(params) {
        super._init(params);
    }

    get nameLabel() {
        return this._nameLabel;
    }

    get dateLabel() {
        return this._dateLabel;
    }

    get image() {
        return this._image;
    }

    get temperatureLabel() {
        return this._temperatureLabel;
    }
});
