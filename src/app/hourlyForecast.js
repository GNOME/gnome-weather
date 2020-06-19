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

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;
const GWeather = imports.gi.GWeather;

const Util = imports.misc.util;

// In microseconds
const TWENTY_FOUR_HOURS = 24 * 3600 * 1000 * 1000;

var HourlyForecastFrame = GObject.registerClass(class ForecastFrame extends Gtk.Frame {

    _init(params) {
        super._init(Object.assign({
            shadow_type: Gtk.ShadowType.IN,
            name: 'hourly-forecast-frame',
        }, params));
        this.get_accessible().accessible_name = _('Hourly Forecast');

        this._settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });

        this._box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL,
                                  spacing: 0});
        this.add(this._box);

        this._hourlyInfo = [];

        this._hasForecastInfo = false;
    }

    // Ensure that infos are sufficiently spaced, and
    // remove infos for the wrong day
    _preprocess(now, infos) {
        let ret = [];

        for (let i = 0; i < infos.length; i++) {
            let info = infos[i];

            let [ok, date] = info.get_value_update();
            let datetime = GLib.DateTime.new_from_unix_utc(date).to_timezone(now.get_timezone());

            if (datetime.difference(now) <= 0)
                continue;

            if (datetime.difference(now) >= TWENTY_FOUR_HOURS)
                break;

            ret.push(info);
        }

        return ret;
    }

    update(infos, tz) {
        let now = GLib.DateTime.new_now(tz);
        let hourlyInfo = this._preprocess(now, infos);

        if (hourlyInfo.length > 0) {
            for (let i = 0; i < hourlyInfo.length; i++) {
                let info = hourlyInfo[i];
                this._addHourEntry(info, tz);

                if (i < hourlyInfo.length - 1)
                    this._addSeparator();
            }
        } else {
            let label = new Gtk.Label({ label: _('Forecast not available'),
                                        use_markup: true,
                                        visible: true });
            this._box.pack_start(label, true, false, 0);
        }

        this._hourlyInfo = hourlyInfo;
    }

    _addHourEntry(info, tz) {
        let [ok, date] = info.get_value_update();
        let datetime = GLib.DateTime.new_from_unix_utc(date).to_timezone(tz);

        let timeSetting = this._settings.get_string('clock-format');
        let timeFormat = null;

        if (timeSetting == '12h')
            /* Translators: this is a time format without date used for AM/PM */
            timeFormat = _('%l∶%M %p');
        else
            timeFormat = '%R';

        let hourEntry = new HourEntry();
        hourEntry.timeLabel.label = datetime.format(timeFormat);
        hourEntry.image.iconName = info.get_symbolic_icon_name();
        hourEntry.temperatureLabel.label = Util.getTempString(info);

        this._box.pack_start(hourEntry, false, false, 0);

        this._hasForecastInfo = true;
    }

    _addSeparator() {
        let separator = new Gtk.Separator({ orientation: Gtk.Orientation.VERTICAL,
                                            visible: true});
        this._box.pack_start(separator, false, false, 0);
    }

    clear() {
        this._box.foreach(function(w) { w.destroy(); });
    }

    hasForecastInfo() {
        return this._hasForecastInfo;
    }

    vfunc_draw(cr) {
        let hourlyInfo = this._hourlyInfo;

        let temps = hourlyInfo.map(info => Util.getTemp(info));
        let maxTemp = Math.max(...temps);
        temps = temps.map(t => t / maxTemp);
        let n = temps.length;

        let width = this.get_allocated_width();
        let height = this.get_allocated_height();

        let top_padding = 80;
        let bottom_padding = 40;

        let canvas_height = height - top_padding - bottom_padding;
        let step = (width - (n - 1)) / n;

        let [, borderColor] = this.get_style_context().lookup_color('temp_graph_border_color');
        Gdk.cairo_set_source_rgba(cr, borderColor);
        cr.setLineWidth(2);

        cr.moveTo (0, top_padding + ((1 - temps[0]) * canvas_height));
        for (let i = 0; i < n; i++)
            cr.lineTo((i * step) + step / 2, top_padding + ((1 - temps[i]) * canvas_height));
        cr.lineTo(width, top_padding + ((1 - temps[n - 1]) * canvas_height));
        cr.strokePreserve();

        cr.lineTo(width, height);
        cr.lineTo(0, height);

        let [, backgroundColor] = this.get_style_context().lookup_color('temp_graph_background_color');
        Gdk.cairo_set_source_rgba(cr, backgroundColor);

        cr.fill();

        super.vfunc_draw(cr);
        cr.$dispose();

        return Gdk.EVENT_PROPAGATE;
    }
});

var HourEntry = GObject.registerClass({
    Template: 'resource:///org/gnome/Weather/hour-entry.ui',
    InternalChildren: ['timeLabel', 'image', 'temperatureLabel'],
}, class HourEntry extends Gtk.Box {

    _init(params) {
        super._init(params);
    }

    get timeLabel() {
        return this._timeLabel;
    }

    get image() {
        return this._image;
    }

    get temperatureLabel() {
        return this._temperatureLabel;
    }
});
