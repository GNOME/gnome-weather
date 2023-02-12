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
const ONE_HOUR = 60 * 60 * 1000 * 1000;
const TWENTY_FOUR_HOURS = 24 * ONE_HOUR;

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
    _preprocess(now, forecastInfo, infos) {
        const ret = [forecastInfo, ...infos].filter(info => {
            let [, date] = info.get_value_update();
            let datetime = GLib.DateTime.new_from_unix_utc(date).to_timezone(now.get_timezone());

            // Show the previous hour's forecast until 30 minutes in
            if (datetime.difference(now) <= -ONE_HOUR / 2)
                return false;

            if (datetime.difference(now) >= TWENTY_FOUR_HOURS)
                return false;

            return true;
        });

        return ret;
    }

    update(info) {
        let forecasts = info.get_forecast_list();

        let coords = info.location.get_coords();
        let nearestCity = GWeather.Location.get_world().find_nearest_city(coords[0], coords[1]);
        let tz = nearestCity.get_timezone();
        let now = GLib.DateTime.new_now(tz);

        let hourlyInfo = this._preprocess(now, info, forecasts);

        if (hourlyInfo.length > 0) {
            for (let i = 0; i < hourlyInfo.length; i++) {
                const info = hourlyInfo[i];
                const isNow = i === 0;
                this._addHourEntry(info, tz, isNow);

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

        if (now) {
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

        const pointsGap = entryWidth + separatorWidth;

        let [, strokeColor] = this.get_style_context().lookup_color('weather_temp_chart_stroke_color');
        Gdk.cairo_set_source_rgba(cr, strokeColor);

        let yCords = [];
        for (let i = 0; i < values.length; i++)
            yCords.push((graphMinY + ((1 - values[i]) * graphHeight)));

        let gradients = [];
        let gradientAngles = [];
        for (let i = 0; i < yCords.length; i++) {
            let prevVal = yCords[i];
            let nextVal = prevVal;
            if (i > 0)
                prevVal = yCords[i - 1];
            if (i < yCords.length - 1)
                nextVal = yCords[i + 1];

            gradients.push((nextVal - prevVal) / (2 * pointsGap));
            gradientAngles.push(Math.atan((nextVal - prevVal) / (pointsGap * 2)));
        }

        let x = -pointsGap / 2;

        cr.moveTo(x, yCords[0]);
        const smoothnessVal = 0.4

        for (let i = 0; i < yCords.length + 1; i++) {

            let xDistPrev = pointsGap * smoothnessVal
            if (i > 0)
                xDistPrev = Math.cos(gradientAngles[i - 1]) * pointsGap * smoothnessVal

            let xDistCurrent = pointsGap * smoothnessVal
            if (i < yCords.length)
                xDistCurrent = Math.cos(gradientAngles[i]) * pointsGap * smoothnessVal

            let test = false

            let prevYcord = (i > 0) ? (yCords[i - 1]) : yCords[i]
            let prevGrad = (i > 0) ? (gradients[i - 1]) : 0

            let currYcord = (i < yCords.length) ? (yCords[i]) : yCords[i - 1]
            let currGrad = (i < yCords.length) ? (gradients[i]) : 0


            let pt1 = [x + xDistPrev, prevYcord + prevGrad * xDistPrev]
            let pt2 = [x + pointsGap - xDistCurrent, currYcord - currGrad * xDistCurrent]

            cr.curveTo(
                pt1[0], pt1[1],
                pt2[0], pt2[1],
                x + pointsGap, currYcord
            )

            x += pointsGap;
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
