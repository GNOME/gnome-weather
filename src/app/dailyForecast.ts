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

type PreprocessedInfo = {
    weekHighestTemp: number;
    weekLowestTemp: number;
    days: DayInfo[];
};

type PeriodInfos = {
    day: GWeather.Info;
    night: GWeather.Info;
    morning: GWeather.Info;
    afternoon: GWeather.Info;
    evening: GWeather.Info;
};

function addDay(base: GLib.DateTime): GLib.DateTime {
    const day = base.add_days(1);
    if (!day) {
        throw new Error(
            "We're only adding a single day. Have 10,000 years passed already?"
        );
    }

    return day;
}

export class DailyForecastBox extends Gtk.Box {
    static {
        GObject.registerClass(this);
    }

    public constructor() {
        super({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 0,
            name: 'daily-forecast-box',
        });

        this.update_property(
            [Gtk.AccessibleProperty.LABEL],
            [_('Daily Forecast')]
        );
    }

    // get infos for the correct day
    private preprocess(infos: GWeather.Info[]): PreprocessedInfo {
        let i;

        let day = GLib.DateTime.new_now_local();
        day = addDay(day);

        // First ignore all infos that are on a different
        // older than day.
        // infos are ordered by time, and it's assumed at some point
        // there is an info for the day (otherwise, nothing
        // is shown)
        for (i = 0; i < infos.length; i++) {
            const info = infos[i];

            const datetime = Util.getDateTime(info);
            if (Util.arrayEqual(day.get_ymd(), datetime.get_ymd())) break;
        }

        const weekInfos = [];
        while (i < infos.length) {
            const dayInfos: DayInfo = {day: day, infos: []};
            for (; i < infos.length; i++) {
                const info = infos[i];

                const datetime = Util.getDateTime(info);
                if (!Util.arrayEqual(day.get_ymd(), datetime.get_ymd())) break;

                dayInfos.infos.push(info);
            }
            weekInfos.push(dayInfos);
            day = addDay(day);
        }

        const temperatures = weekInfos
            .map(dayInfos => dayInfos.infos)
            .flat()
            .map(info => Util.getTemp(info));

        const weekHighestTemp = Math.max(...temperatures);
        const weekLowestTemp = Math.min(...temperatures);

        return {
            weekHighestTemp,
            weekLowestTemp,
            days: weekInfos,
        };
    }

    public update(info: GWeather.Info): void {
        const forecasts = info.get_forecast_list();

        const forecast = this.preprocess(forecasts);

        if (forecast.days.length > 1) {
            forecast.days.forEach(info => {
                this.append(
                    this.buildDayEntry(
                        info,
                        forecast.weekHighestTemp,
                        forecast.weekLowestTemp
                    )
                );
                this.append(this.buildSeparator());
            });
        } else {
            const label = new Gtk.Label({
                label: _('Forecast not Available'),
                use_markup: true,
                visible: true,
            });
            this.prepend(label);
        }
    }

    private buildDayEntry(
        dayInfos: DayInfo,
        weekHighestTemp: number,
        weekLowestTemp: number
    ): DayEntry {
        const {day, infos} = dayInfos;
        const datetime = Util.getDay(day);

        const temperatures = infos.map(info => Util.getTemp(info));
        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);

        const periodInfos: Record<string, GWeather.Info> = {};
        const times: Record<string, GLib.DateTime> = {
            day: Util.getDay(datetime),
            night: Util.getNight(datetime),
            morning: Util.getMorning(datetime),
            afternoon: Util.getAfternoon(datetime),
            evening: Util.getEvening(datetime),
        };

        const datetimes = infos.map(info => Util.getDateTime(info));

        for (const period of [
            'day',
            'night',
            'morning',
            'afternoon',
            'evening',
        ]) {
            const differences = datetimes.map(datetime =>
                Math.abs(datetime.difference(times[period]))
            );

            const index = differences.indexOf(Math.min(...differences));

            periodInfos[period] = infos[index];
        }

        const {day: dayInfo, night, morning, afternoon, evening} = periodInfos;

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
            evening,
        });
    }

    private buildSeparator(): Gtk.Separator {
        return new Gtk.Separator({
            orientation: Gtk.Orientation.VERTICAL,
            visible: true,
        });
    }

    public clear(): void {
        for (const entry of Array.from(this)) {
            entry.unparent();
        }
    }
}

export class DayEntry extends Adw.Bin {
    declare private _nameLabel: Gtk.Label;
    declare private _dateLabel: Gtk.Label;
    declare private _image: Gtk.Image;
    declare private _nightTemperatureLabel: Gtk.Label;
    declare private _nightImage: Gtk.Image;
    declare private _nightHumidity: Gtk.Label;
    declare private _nightWind: Gtk.Label;
    declare private _morningTemperatureLabel: Gtk.Label;
    declare private _morningImage: Gtk.Image;
    declare private _morningHumidity: Gtk.Label;
    declare private _morningWind: Gtk.Label;
    declare private _afternoonTemperatureLabel: Gtk.Label;
    declare private _afternoonImage: Gtk.Image;
    declare private _afternoonHumidity: Gtk.Label;
    declare private _afternoonWind: Gtk.Label;
    declare private _eveningTemperatureLabel: Gtk.Label;
    declare private _eveningImage: Gtk.Image;
    declare private _eveningHumidity: Gtk.Label;
    declare private _eveningWind: Gtk.Label;
    declare private _thermometer: Thermometer.Thermometer;

    private datetime: GLib.DateTime;
    private info: PeriodInfos;
    private maxTemp: number;
    private minTemp: number;
    private weekHighestTemp: number;
    private weekLowestTemp: number;

    static {
        GObject.registerClass(
            {
                Template: 'resource:///org/gnome/Weather/day-entry.ui',
                InternalChildren: [
                    'nameLabel',
                    'dateLabel',
                    'image',
                    'thermometer',
                    'nightTemperatureLabel',
                    'nightImage',
                    'nightHumidity',
                    'nightWind',
                    'morningTemperatureLabel',
                    'morningImage',
                    'morningHumidity',
                    'morningWind',
                    'afternoonTemperatureLabel',
                    'afternoonImage',
                    'afternoonHumidity',
                    'afternoonWind',
                    'eveningTemperatureLabel',
                    'eveningImage',
                    'eveningHumidity',
                    'eveningWind',
                ],
            },
            this
        );
    }

    public constructor(params: {
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
            evening,
        } = params;

        super();

        this.datetime = datetime;
        this.info = {
            day,
            night,
            morning,
            afternoon,
            evening,
        };
        this.maxTemp = maxTemp;
        this.minTemp = minTemp;
        this.weekHighestTemp = weekHighestTemp;
        this.weekLowestTemp = weekLowestTemp;
    }

    public vfunc_root(): void {
        super.vfunc_root();

        const {datetime} = this;
        const {
            day: dayInfo,
            evening: eveningInfo,
            night: nightInfo,
            morning: morningInfo,
            afternoon: afternoonInfo,
        } = this.info;

        this._nameLabel.label = datetime.format('%a') ?? '';
        /* Translators: this is the time format for day and month name according to the current locale */
        const dateFormat = _('%b %e');
        this._dateLabel.label = datetime.format(dateFormat) ?? '';

        this._image.iconName = `${dayInfo.get_icon_name()}-small`;

        this._thermometer.range = new Thermometer.TemperatureRange({
            dailyLow: this.minTemp,
            dailyHigh: this.maxTemp,
            weeklyLow: this.weekLowestTemp,
            weeklyHigh: this.weekHighestTemp,
        });
        this._nightTemperatureLabel.label = Util.getTempString(nightInfo) ?? '';
        this._nightImage.iconName = nightInfo.get_icon_name() + '-small';
        this._nightHumidity.label = nightInfo.get_humidity();
        this.setWindInfo(nightInfo, this._nightWind);

        this._morningTemperatureLabel.label =
            Util.getTempString(morningInfo) ?? '';
        this._morningImage.iconName = morningInfo.get_icon_name() + '-small';
        this._morningHumidity.label = morningInfo.get_humidity();
        this.setWindInfo(morningInfo, this._morningWind);

        this._afternoonTemperatureLabel.label =
            Util.getTempString(afternoonInfo) ?? '';
        this._afternoonImage.iconName =
            afternoonInfo.get_icon_name() + '-small';
        this._afternoonHumidity.label = afternoonInfo.get_humidity();
        this.setWindInfo(afternoonInfo, this._afternoonWind);

        this._eveningTemperatureLabel.label =
            Util.getTempString(eveningInfo) ?? '';
        this._eveningImage.iconName = eveningInfo.get_icon_name() + '-small';
        this._eveningHumidity.label = eveningInfo.get_humidity();
        this.setWindInfo(eveningInfo, this._eveningWind);
    }

    private setWindInfo(info: GWeather.Info, label: Gtk.Label): void {
        const [ok, speed] = info.get_value_wind(GWeather.SpeedUnit.DEFAULT);
        if (ok) {
            label.label = `${speed.toFixed(1)} ${GWeather.speed_unit_to_string(GWeather.SpeedUnit.DEFAULT)}`;
        } else {
            /* Fall back to get_wind() */
            label.label = info.get_wind();
        }
    }
}
