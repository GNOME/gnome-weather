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

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GWeather from 'gi://GWeather';
import Graphene from 'gi://Graphene';

import * as Util from '../misc/util.js';

// In microseconds
const TWENTY_FOUR_HOURS = 24 * 3600 * 1000 * 1000;

export class HourlyForecastBox extends Gtk.Box {
    constructor() {
        super({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 0,
            name: 'hourly-forecast-box',
        });

        this.update_property([Gtk.AccessibleProperty.LABEL], [_('Hourly Forecast')]);
        this._settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });

        this._hourlyInfo = [];

        this._hasForecastInfo = false;
    }

    // Ensure that infos are sufficiently spaced, and
    // remove infos for the wrong day
    _preprocess(now, infos) {
        let ret = [];

        for (let i = 0; i < infos.length; i++) {
            let info = infos[i];

            let [, date] = info.get_value_update();
            let datetime = GLib.DateTime.new_from_unix_utc(date).to_timezone(now.get_timezone());

            if (datetime.difference(now) <= 0)
                continue;

            if (datetime.difference(now) >= TWENTY_FOUR_HOURS)
                break;

            ret.push(info);
        }

        return ret;
    }

    update(info) {
        let forecasts = info.get_forecast_list();

        let coords = info.location.get_coords();
        let nearestCity = GWeather.Location.get_world().find_nearest_city(coords[0], coords[1]);
        let tz = nearestCity.get_timezone();
        let now = GLib.DateTime.new_now(tz);

        let hourlyInfo = this._preprocess(now, forecasts);

        hourlyInfo.unshift(info);

        if (hourlyInfo.length > 0) {
            for (let i = 0; i < hourlyInfo.length; i++) {
                let info = hourlyInfo[i];
                this._addHourEntry(info, tz, now);

                if (i < hourlyInfo.length - 1)
                    this._addSeparator();
            }
        } else {
            let label = new Gtk.Label({
                label: _('Forecast not Available'),
                use_markup: true,
                visible: true
            });
            this.prepend(label);
        }

        this._hourlyInfo = hourlyInfo;
    }

    _addHourEntry(info, tz, now) {
        let timeLabel;

        let [, date] = info.get_value_update();
        let datetime = GLib.DateTime.new_from_unix_utc(date).to_timezone(tz);

        if (now.get_hour() == datetime.get_hour()) {
            timeLabel = _('Now');
        } else {
            let timeSetting = this._settings.get_string('clock-format');
            let timeFormat = null;

            if (timeSetting == '12h')
                /* Translators: this is a time format without date used for AM/PM */
                timeFormat = _('%l∶%M %p');
            else
                timeFormat = '%R';

            timeLabel = datetime.format(timeFormat);
        }

        let hourEntry = new HourEntry({ info, timeLabel });

        this.append(hourEntry);

        this._hasForecastInfo = true;
    }

    _addSeparator() {
        let separator = new Gtk.Separator({
            orientation: Gtk.Orientation.VERTICAL,
            visible: true
        });
        this.append(separator);
    }

    clear() {
        for (const w of Array.from(this)) {
            this.remove(w);
        }
    }

    hasForecastInfo() {
        return this._hasForecastInfo;
    }

    vfunc_snapshot(snapshot) {
        const allocation = this.get_allocation();

        const rect = new Graphene.Rect();
        rect.init(0, 0, allocation.width, allocation.height);

        let cr = snapshot.append_cairo(rect);
        const temps = this._hourlyInfo.map(info => Util.getTemp(info));

        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);

        let values;
        if (minTemp != maxTemp) {
            values = temps.map(t => (t - minTemp) / (maxTemp - minTemp));
        } else {
            values = temps.map(t => t / 2);
        }

        const width = this.get_allocated_width();
        const height = this.get_allocated_height();

        const entryWidth = 75;
        const separatorWidth = 1;

        const lineWidth = 2;

        const entryImageY = 56, entryImageHeight = 32;
        const entryTemperatureLabelHeight = 19;

        const spacing = 18;

        const graphMinY = lineWidth / 2 + entryImageY + entryImageHeight + spacing;
        const graphMaxY = height - lineWidth / 2 - spacing - entryTemperatureLabelHeight - spacing;
        const graphHeight = graphMaxY - graphMinY;

        let [, strokeColor] = this.get_style_context().lookup_color('weather_temp_chart_stroke_color');
        Gdk.cairo_set_source_rgba(cr, strokeColor);

        let x = 0;
        cr.moveTo(x, graphMinY + ((1 - values[0]) * graphHeight));

        x += entryWidth / 2;
        cr.lineTo(x, graphMinY + ((1 - values[0]) * graphHeight));

        for (let i = 1; i < values.length; i++) {
            x += entryWidth + separatorWidth;
            cr.lineTo(x, graphMinY + ((1 - values[i]) * graphHeight));
        }

        cr.lineTo(width, graphMinY + ((1 - values[values.length - 1]) * graphHeight));

        cr.setLineWidth(lineWidth);
        cr.strokePreserve();

        let [, fillColor] = this.get_style_context().lookup_color('weather_temp_chart_fill_color');

        Gdk.cairo_set_source_rgba(cr, fillColor);

        cr.lineTo(width, height);
        cr.lineTo(0, height);
        cr.fill();

        super.vfunc_snapshot(snapshot);
        cr.$dispose();
    }
};
GObject.registerClass(HourlyForecastBox);

export const HourEntry = GObject.registerClass({
    Template: 'resource:///org/gnome/Weather/hour-entry.ui',

    InternalChildren: ['timeLabel', 'image', 'forecastTemperatureLabel'],
}, class HourEntry extends Gtk.Widget {
    constructor({ timeLabel, info, ...params }) {
        super({ ...params });

        Object.assign(this.layoutManager, {
            orientation: Gtk.Orientation.VERTICAL,
        });

        this._timeLabel.label = timeLabel;
        this._image.iconName = info.get_icon_name() + '-small';
        this._forecastTemperatureLabel.label = Util.getTempString(info);
    }

    vfunc_unroot() {
        [...this].forEach(child => child.unparent());

        super.vfunc_unroot();
    }
});

HourEntry.set_layout_manager_type(Gtk.BoxLayout);