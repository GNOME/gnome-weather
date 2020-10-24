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

var DailyForecastFrame = GObject.registerClass(class DailyForecastFrame extends Gtk.Frame {

    _init(params) {
        super._init(Object.assign({
            halign: Gtk.Align.START,
            margin_start: 20,
            margin_end: 20,
            shadow_type: Gtk.ShadowType.IN,
            name: 'daily-forecast-frame',
        }, params));

        this.get_accessible().accessible_name = _('Daily Forecast');

        this._box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL,
                                  spacing: 0});
        this.add(this._box);
    }

    // get infos for the correct day
    _preprocess(infos) {
        let i;

        let day = GLib.DateTime.new_now_local();
        day = day.add_days(1);

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
            let dayInfos = {day: day, infos: []};
            for ( ; i < infos.length; i++) {
                let info = infos[i];

                let datetime = Util.getDateTime(info);
                if (!Util.arrayEqual(day.get_ymd(), datetime.get_ymd()))
                    break;

                dayInfos.infos.push(info);
            }
            weekInfos.push(dayInfos);
            day = day.add_days(1);
        }
        return weekInfos;
    }

    update(infos) {
        let weekInfos = this._preprocess(infos);

        if (weekInfos.length > 0) {
            for (let i = 0; i < weekInfos.length; i++) {
                let dayInfos = weekInfos[i];
                this._addDayEntry(dayInfos);

                if (i < weekInfos.length - 1)
                    this._addSeparator();
            }
        } else {
            let label = new Gtk.Label({ label: _('Forecast not available'),
                                        use_markup: true,
                                        visible: true });
            this._box.pack_start(label, true, false, 0);
        }
    }

    _addDayEntry({day, infos}) {
        let maxInfo;
        let maxTemp = -Infinity;

        let minInfo;
        let minTemp = Infinity;

        day = Util.getDay(day);
        let dayInfo;
        let dayDiff = Infinity;

        let night = Util.getNight(day);
        let nightInfo;
        let nightDiff = Infinity;

        let morning = Util.getMorning(day);
        let morningInfo;
        let morningDiff = Infinity;

        let afternoon = Util.getAfternoon(day);
        let afternoonInfo;
        let afternoonDiff = Infinity;

        let evening = Util.getEvening(day);
        let eveningInfo;
        let eveningDiff = Infinity;

        for (let i = 0; i < infos.length; i++) {
            let info = infos[i];

            let temp = Util.getTemp(info);
            if (temp > maxTemp) {
                maxInfo = info;
                maxTemp = temp;
            }
            if (temp < minTemp) {
                minInfo = info;
                minTemp = minTemp;
            }

            let datetime = Util.getDateTime(info);

            let diff = Math.abs(datetime.difference(day));
            if (diff < dayDiff) {
                dayInfo = info;
                dayDiff = diff;
            }

            diff = Math.abs(datetime.difference(night));
            if (diff < nightDiff) {
                nightInfo = info;
                nightDiff = diff;
            }

            diff = Math.abs(datetime.difference(morning));
            if (diff < morningDiff) {
                morningInfo = info;
                morningDiff = diff;
            }

            diff = Math.abs(datetime.difference(afternoon));
            if (diff < afternoonDiff) {
                afternoonInfo = info;
                afternoonDiff = diff;
            }

            diff = Math.abs(datetime.difference(evening));
            if (diff < eveningDiff) {
                eveningInfo = info;
                eveningDiff = diff;
            }
        }

        let dayEntry = new DayEntry();

        let nameFormat = '%a';
        dayEntry.nameLabel.label = day.format(nameFormat);

        /* Translators: this is the time format for day and month name according to the current locale */
        let dateFormat = _('%e %b');
        dayEntry.dateLabel.label = day.format(dateFormat);

        dayEntry.image.iconName = dayInfo.get_symbolic_icon_name();

        dayEntry.maxTemperatureLabel.label = Util.getTempString(maxInfo);
        dayEntry.minTemperatureLabel.label = Util.getTempString(minInfo);

        dayEntry.nightTemperatureLabel.label = Util.getTempString(nightInfo);
        dayEntry.nightImage.iconName = nightInfo.get_symbolic_icon_name();
        dayEntry.nightHumidity.label = nightInfo.get_humidity();
        dayEntry.nightWind.label = nightInfo.get_wind();

        dayEntry.morningTemperatureLabel.label = Util.getTempString(morningInfo);
        dayEntry.morningImage.iconName = morningInfo.get_symbolic_icon_name();
        dayEntry.morningHumidity.label = morningInfo.get_humidity();
        dayEntry.morningWind.label = morningInfo.get_wind();

        dayEntry.afternoonTemperatureLabel.label = Util.getTempString(afternoonInfo);
        dayEntry.afternoonImage.iconName = afternoonInfo.get_symbolic_icon_name();
        dayEntry.afternoonHumidity.label = afternoonInfo.get_humidity();
        dayEntry.afternoonWind.label = afternoonInfo.get_wind();

        dayEntry.eveningTemperatureLabel.label = Util.getTempString(eveningInfo);
        dayEntry.eveningImage.iconName = eveningInfo.get_symbolic_icon_name();
        dayEntry.eveningHumidity.label = eveningInfo.get_humidity();
        dayEntry.eveningWind.label = eveningInfo.get_wind();

        this._box.pack_start(dayEntry, false, false, 0);
    }

    _addSeparator() {
        let separator = new Gtk.Separator({ orientation: Gtk.Orientation.VERTICAL,
                                            visible: true});
        this._box.pack_start(separator, false, false, 0);
    }

    clear() {
        this._box.foreach(function(w) { w.destroy(); });
    }
});

var DayEntry = GObject.registerClass({
    Template: 'resource:///org/gnome/Weather/day-entry.ui',
    InternalChildren: ['nameLabel', 'dateLabel', 'image',
                       'maxTemperatureLabel', 'minTemperatureLabel',
                       'nightTemperatureLabel', 'nightImage',
                       'nightHumidity', 'nightWind',
                       'morningTemperatureLabel', 'morningImage',
                       'morningHumidity', 'morningWind',
                       'afternoonTemperatureLabel', 'afternoonImage',
                       'afternoonHumidity', 'afternoonWind',
                       'eveningTemperatureLabel', 'eveningImage',
                       'eveningHumidity', 'eveningWind'],
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

    get maxTemperatureLabel() {
        return this._maxTemperatureLabel;
    }

    get minTemperatureLabel() {
        return this._minTemperatureLabel;
    }

    get nightTemperatureLabel() {
        return this._nightTemperatureLabel;
    }

    get nightImage() {
        return this._nightImage;
    }

    get nightHumidity() {
        return this._nightHumidity;
    }

    get nightWind() {
        return this._nightWind;
    }

    get morningTemperatureLabel() {
        return this._morningTemperatureLabel;
    }

    get morningImage() {
        return this._morningImage;
    }

    get morningHumidity() {
        return this._morningHumidity;
    }

    get morningWind() {
        return this._morningWind;
    }

    get afternoonTemperatureLabel() {
        return this._afternoonTemperatureLabel;
    }

    get afternoonImage() {
        return this._afternoonImage;
    }

    get afternoonHumidity() {
        return this._afternoonHumidity;
    }

    get afternoonWind() {
        return this._afternoonWind;
    }

    get eveningTemperatureLabel() {
        return this._eveningTemperatureLabel;
    }

    get eveningImage() {
        return this._eveningImage;
    }

    get eveningHumidity() {
        return this._eveningHumidity;
    }

    get eveningWind() {
        return this._eveningWind;
    }
});
