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

        this.get_style_context().add_class("forecast-frame");

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
        super.vfunc_draw(cr);

        const temps = this._hourlyInfo.map(info => Util.getTemp(info));

        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);

        const values = temps.map(t => (t - minTemp) / (maxTemp - minTemp));

        const frameWidth = this.get_allocated_width();
        const frameHeight = this.get_allocated_height();

        const entryWidth = 75;
        const separatorWidth = 1;

        const frameBorderWidth = 1;
        const lineWidth = 2;

        const entryImageY = 56, entryImageHeight = 32;
        const entryTemperatureLabelHeight = 19;

        const spacing = 18;

        const graphMinY = frameBorderWidth + lineWidth / 2 + entryImageY + entryImageHeight + spacing;
        const graphMaxY = frameHeight - frameBorderWidth - lineWidth / 2 - spacing - entryTemperatureLabelHeight - spacing;
        const graphHeight = graphMaxY - graphMinY;

        let [, borderColor] = this.get_style_context().lookup_color('temp_graph_border_color');
        Gdk.cairo_set_source_rgba(cr, borderColor);
        cr.setLineWidth(lineWidth);

        let [, backgroundColor] = this.get_style_context().lookup_color('temp_graph_background_color');
        Gdk.cairo_set_source_rgba(cr, backgroundColor);
        let x = 0;
        cr.moveTo (x, graphMinY + ((1 - values[0]) * graphHeight));

        x += entryWidth / 2;
        cr.lineTo(x, graphMinY + ((1 - values[0]) * graphHeight));

        for (let i = 1; i < values.length; i++) {
            x += entryWidth + separatorWidth;
            cr.lineTo(x, graphMinY + ((1 - values[i]) * graphHeight));
        }

        cr.lineTo(frameWidth, graphMinY + ((1 - values[values.length - 1]) * graphHeight));
        cr.strokePreserve();


        cr.lineTo(frameWidth, frameHeight);
        cr.lineTo(0, frameHeight);
        cr.fill();

        cr.$dispose();

        return Gdk.EVENT_PROPAGATE;
    }
});

var HourEntry = GObject.registerClass({
    Template: 'resource:///org/gnome/Weather/hour-entry.ui',
    InternalChildren: ['timeLabel', 'image', 'temperatureLabel'],
}, class HourEntry extends Gtk.Alignment {

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
