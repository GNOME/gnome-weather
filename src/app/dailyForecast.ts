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

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GWeather from 'gi://GWeather';
import Adw from 'gi://Adw';

import * as Thermometer from './thermometer.js';
import * as Util from '../misc/util.js';

type DayInfo = {
    day: GLib.DateTime;
    infos: GWeather.Info[];
};

type PeriodInfos = {
    day: GWeather.Info;
    night: GWeather.Info;
    morning: GWeather.Info;
    afternoon: GWeather.Info;
    evening: GWeather.Info;
};

export class DailyForecastBox extends Gtk.Box {

    constructor() {
        super({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 0,
            name: 'daily-forecast-box',
        });

        this.update_property([Gtk.AccessibleProperty.LABEL], [_('Daily Forecast')]);
    }

    // get infos for the correct day
    _preprocess(infos: GWeather.Info[]) {
        let i;

        let day = GLib.DateTime.new_now_local();
        // We're just adding one day at a time, GLib should be able to handle this fine.
        day = day.add_days(1)!;

        // First ignore all infos that are on a different
        // older than day.
        // infos are ordered by time, and it's assumed at some point
        // there is an info for the day (otherwise, nothing
        // is shown)
        for (i = 0; i < infos.length; i++) {
            let info = infos[i];

            let datetime = Util.getDateTime(info);
            if (Util.arrayEqual(day.get_ymd(), datetime.get_ymd()))
                break;
        }

        let weekInfos = [];
        while (i < infos.length) {
            let dayInfos: DayInfo = { day: day, infos: [] };
            for (; i < infos.length; i++) {
                let info = infos[i];

                let datetime = Util.getDateTime(info);
                if (!Util.arrayEqual(day.get_ymd(), datetime.get_ymd()))
                    break;

                dayInfos.infos.push(info);
            }
            weekInfos.push(dayInfos);
            day = day.add_days(1)!;
        }

        const temperatures = weekInfos.map(dayInfos => dayInfos.infos)
            .flat()
            .map(info => Util.getTemp(info));

        const weekHighestTemp = Math.max(...temperatures);
        const weekLowestTemp = Math.min(...temperatures);

        return {
            weekHighestTemp,
            weekLowestTemp,
            days: weekInfos
        };
    }

    update(info: GWeather.Info) {
        let forecasts = info.get_forecast_list();

        let forecast = this._preprocess(forecasts);

        if (forecast.days.length > 1) {
            forecast.days.forEach((info) => {
                this.append(this._buildDayEntry(info, forecast.weekHighestTemp, forecast.weekLowestTemp));
                this.append(this._buildSeparator());
            })
        } else {
            let label = new Gtk.Label({
                label: _('Forecast not Available'),
                use_markup: true,
                visible: true
            });
            this.prepend(label);
        }
    }

    _buildDayEntry(dayInfos: DayInfo, weekHighestTemp: number, weekLowestTemp: number) {
        const { day, infos } = dayInfos;
        let datetime = Util.getDay(day);

        const temperatures = infos.map(info => Util.getTemp(info));
        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);

        let periodInfos: Record<string, GWeather.Info> = {};
        let times: Record<string, GLib.DateTime> = {
            day: Util.getDay(datetime),
            night: Util.getNight(datetime),
            morning: Util.getMorning(datetime),
            afternoon: Util.getAfternoon(datetime),
            evening: Util.getEvening(datetime)
        };

        const datetimes = infos.map(info => Util.getDateTime(info));

        for (const period of ['day', 'night', 'morning', 'afternoon', 'evening']) {
            const differences = datetimes.map(datetime => Math.abs(datetime.difference(times[period])));

            const index = differences.indexOf(Math.min(...differences))

            periodInfos[period] = infos[index];
        }


        const { day: dayInfo, night, morning, afternoon, evening } = periodInfos;

        return new DayEntry({
            datetime,
            weekHighestTemp,
            weekLowestTemp,
            maxTemp,
            minTemp,
            day: dayInfo,
            night,
            morning,
            afternoon,
            evening
        });
    }

    _buildSeparator() {
        return new Gtk.Separator({
            orientation: Gtk.Orientation.VERTICAL,
            visible: true
        });
    }

    clear() {
        for (const entry of Array.from(this)) {
            entry.unparent();
        }
    }
};
GObject.registerClass(DailyForecastBox);

export const DayEntry = GObject.registerClass({
    Template: 'resource:///org/gnome/Weather/day-entry.ui',
    InternalChildren: ['nameLabel', 'dateLabel', 'image',
        'thermometer',
        'nightTemperatureLabel', 'nightImage',
        'nightHumidity', 'nightWind',
        'morningTemperatureLabel', 'morningImage',
        'morningHumidity', 'morningWind',
        'afternoonTemperatureLabel', 'afternoonImage',
        'afternoonHumidity', 'afternoonWind',
        'eveningTemperatureLabel', 'eveningImage',
        'eveningHumidity', 'eveningWind'],
}, class DayEntry extends Adw.Bin {
    _nameLabel!: Gtk.Label;
    _dateLabel!: Gtk.Label;
    _image!: Gtk.Image;
    _nightTemperatureLabel!: Gtk.Label;
    _nightImage!: Gtk.Image;
    _nightHumidity!: Gtk.Label;
    _nightWind!: Gtk.Label;
    _morningTemperatureLabel!: Gtk.Label;
    _morningImage!: Gtk.Image;
    _morningHumidity!: Gtk.Label;
    _morningWind!: Gtk.Label;
    _afternoonTemperatureLabel!: Gtk.Label;
    _afternoonImage!: Gtk.Image;
    _afternoonHumidity!: Gtk.Label;
    _afternoonWind!: Gtk.Label;
    _eveningTemperatureLabel!: Gtk.Label;
    _eveningImage!: Gtk.Image;
    _eveningHumidity!: Gtk.Label;
    _eveningWind!: Gtk.Label;
    _thermometer!: Thermometer.Thermometer;

    datetime: GLib.DateTime;
    info: PeriodInfos;
    maxTemp: number;
    minTemp: number;
    weekHighestTemp: number;
    weekLowestTemp: number;

    constructor(params: {
            datetime: GLib.DateTime;
            weekHighestTemp: number;
            weekLowestTemp: number;
            maxTemp: number;
            minTemp: number;
            day: GWeather.Info;
            night: GWeather.Info;
            morning: GWeather.Info;
            afternoon: GWeather.Info;
            evening: GWeather.Info;
        }) {
        const {
            datetime,
            maxTemp,
            minTemp,
            weekHighestTemp,
            weekLowestTemp,
            day,
            night,
            morning,
            afternoon,
            evening
        } = params;

        super();

        this.datetime = datetime;
        this.info = {
            day,
            night,
            morning,
            afternoon,
            evening
        };
        this.maxTemp = maxTemp;
        this.minTemp = minTemp;
        this.weekHighestTemp = weekHighestTemp;
        this.weekLowestTemp = weekLowestTemp;
    }

    vfunc_root() {
        super.vfunc_root();

        const { datetime } = this;
        const { day: dayInfo, evening: eveningInfo, night: nightInfo, morning: morningInfo, afternoon: afternoonInfo } = this.info;

        this._nameLabel.label = datetime.format('%a') ?? '';
        /* Translators: this is the time format for day and month name according to the current locale */
        let dateFormat = _('%b %e');
        this._dateLabel.label = datetime.format(dateFormat) ?? '';

        this._image.iconName = `${dayInfo.get_icon_name()}-small`;

        // @ts-expect-error Need to expose this properly as both a GObject prop and a GJS prop
        this._thermometer.range = new Thermometer.TemperatureRange({ dailyLow: this.minTemp, dailyHigh: this.maxTemp, weeklyLow: this.weekLowestTemp, weeklyHigh: this.weekHighestTemp });
        this._nightTemperatureLabel.label = Util.getTempString(nightInfo) ?? '';
        this._nightImage.iconName = nightInfo.get_icon_name() + '-small';
        this._nightHumidity.label = nightInfo.get_humidity();
        this._setWindInfo(nightInfo, this._nightWind);

        this._morningTemperatureLabel.label = Util.getTempString(morningInfo) ?? '';
        this._morningImage.iconName = morningInfo.get_icon_name() + '-small';
        this._morningHumidity.label = morningInfo.get_humidity();
        this._setWindInfo(morningInfo, this._morningWind);

        this._afternoonTemperatureLabel.label = Util.getTempString(afternoonInfo) ?? '';
        this._afternoonImage.iconName = afternoonInfo.get_icon_name() + '-small';
        this._afternoonHumidity.label = afternoonInfo.get_humidity();
        this._setWindInfo(afternoonInfo, this._afternoonWind);

        this._eveningTemperatureLabel.label = Util.getTempString(eveningInfo) ?? '';
        this._eveningImage.iconName = eveningInfo.get_icon_name() + '-small';
        this._eveningHumidity.label = eveningInfo.get_humidity();
        this._setWindInfo(eveningInfo, this._eveningWind);
    }

    _setWindInfo(info: GWeather.Info, label: Gtk.Label) {
        let [ok, speed, direction] = info.get_value_wind(GWeather.SpeedUnit.DEFAULT);
        if (ok) {
            label.label = `${speed.toFixed(1).toString()} ${GWeather.speed_unit_to_string(GWeather.SpeedUnit.DEFAULT)}`;
        } else {
            /* Fall back to get_wind() */
            label.label = info.get_wind();
        }
    }
});
