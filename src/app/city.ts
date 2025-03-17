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

import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GWeather from 'gi://GWeather';

import * as WorldView from './world.js';
import * as Util from '../misc/util.js';

import './hourlyForecast.js';
import './dailyForecast.js';
import { WeatherApplication } from './application.js';
import { MainWindow } from './window.js';
import { HourlyForecastBox } from './hourlyForecast.js';
import { DailyForecastBox } from './dailyForecast.js';

const SCROLLING_ANIMATION_TIME = 400000; //us

const UPDATED_TIME_TIMEOUT = 60; //s

export class WeatherWidget extends Adw.Bin {
    _conditionsImage!: Gtk.Image;
    _placesButton!: Gtk.MenuButton;
    _temperatureLabel!: Gtk.Label;
    _apparentLabel!: Gtk.Label;
    _forecastStack!: Adw.ViewStack;
    _leftButton!: Gtk.Button;
    _rightButton!: Gtk.Button;
    _forecastHourly!: HourlyForecastBox;
    _forecastHourlyAdjustment!: Gtk.Adjustment;
    _forecastDaily!: DailyForecastBox;
    _forecastDailyAdjustment!: Gtk.Adjustment;
    _updatedTimeLabel!: Gtk.Label;
    _attributionLabel!: Gtk.Label;

    _worldView: WorldView.WorldContentView;

    _tickId: number;
    _updatedTime?: number;
    _updatedTimeTimeoutId: number;
    _info?: GWeather.Info;

    static {
        GObject.registerClass({
            Template: 'resource:///org/gnome/Weather/weather-widget.ui',
            InternalChildren: [
                'conditionsImage',
                'placesButton',
                'temperatureLabel',
                'apparentLabel',
                'forecastStack',
                'leftButton',
                'rightButton',
                'forecastHourly',
                'forecastHourlyScrollWindow',
                'forecastHourlyAdjustment',
                'forecastDaily',
                'forecastDailyScrollWindow',
                'forecastDailyAdjustment',
                'updatedTimeLabel',
                'attributionLabel'
            ],
        }, this);
    }

    constructor(application: WeatherApplication, window: MainWindow) {
        super({
            name: 'weather-page'
        });

        Object.assign(this.layoutManager, {
            maximumSize: 1010,
            // Ensures ~18px of margin on the right side
            tighteningThreshold: 992,
        });

        this._worldView = new WorldView.WorldContentView(application, window,  {
            align: Gtk.Align.START,
        });
        this._placesButton.set_popover(this._worldView);

        for (const adjustment of [this._forecastHourlyAdjustment, this._forecastDailyAdjustment]) {
            adjustment.connect('changed', () => this._syncLeftRightButtons());
            adjustment.connect('value-changed', () => this._syncLeftRightButtons());
        }

        this._forecastStack.connect('notify::visible-child', () => {
            const visible_child = this._forecastStack.visible_child as Gtk.ScrolledWindow;
            if (visible_child == null)
                return; // can happen at destruction

            const hadjustment = visible_child.get_hadjustment();
            hadjustment.value = hadjustment.get_lower();
            this._syncLeftRightButtons();

            if (this._tickId) {
                this.remove_tick_callback(this._tickId);
                this._tickId = 0;
            }
        });

        this._tickId = 0;

        this._leftButton.connect('clicked', () => {
            const hadjustment = (this._forecastStack.visible_child as Gtk.ScrolledWindow).get_hadjustment();
            const target = hadjustment.value - hadjustment.page_size;

            this._beginScrollAnimation(target);
        });

        this._rightButton.connect('clicked', () => {
            const hadjustment = (this._forecastStack.visible_child as Gtk.ScrolledWindow).get_hadjustment();
            const target = hadjustment.value + hadjustment.page_size;

            this._beginScrollAnimation(target);
        });

        this._updatedTime = undefined;
        this._updatedTimeTimeoutId = 0;
    }

    vfunc_unmap(): void {
        if (this._updatedTimeTimeoutId) {
            GLib.Source.remove(this._updatedTimeTimeoutId);
            this._updatedTimeTimeoutId = 0;
        }

        super.vfunc_unmap();
    }

    _syncLeftRightButtons(): void {
        const visible_child = this._forecastStack.visible_child as Gtk.ScrolledWindow;
        const hadjustment = visible_child.get_hadjustment();
        if ((hadjustment.get_upper() - hadjustment.get_lower()) == hadjustment.page_size) {
            this._leftButton.hide();
            this._rightButton.hide();
        } else if (hadjustment.value == hadjustment.get_lower()) {
            this._leftButton.hide();
            this._rightButton.show();
        } else if (hadjustment.value >= (hadjustment.get_upper() - hadjustment.page_size)) {
            this._leftButton.show();
            this._rightButton.hide();
        } else {
            this._leftButton.show();
            this._rightButton.show();
        }
    }

    _beginScrollAnimation(target: number): void {
        if (this.get_realized()) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const start = this.get_frame_clock()!.get_frame_time();
            const end = start + SCROLLING_ANIMATION_TIME;

            if (this._tickId != 0)
                this.remove_tick_callback(this._tickId);

            this._tickId = this.add_tick_callback(() => this._animate(target, start, end));
        }
    }

    _animate(target: number, start: number, end: number): boolean {
        const hadjustment = (this._forecastStack.visible_child as Gtk.ScrolledWindow).get_hadjustment();
        const value = hadjustment.value;
        let t = 1.0;

        if (this.get_realized()) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const now = this.get_frame_clock()!.get_frame_time();
            if (now < end) {
                t = (now - start) / SCROLLING_ANIMATION_TIME;
                t = Util.easeOutCubic(t);
                hadjustment.value = value + t * (target - value);
                return GLib.SOURCE_CONTINUE;
            } else {
                hadjustment.value = value + t * (target - value);
                this._tickId = 0;
                return GLib.SOURCE_REMOVE;
            }
        }

        return GLib.SOURCE_REMOVE;
    }

    clear(): void {
        this._forecastHourly.clear();
        this._forecastDaily.clear();

        if (this._tickId) {
            this.remove_tick_callback(this._tickId);
            this._tickId = 0;
        }
    }

    getForecastStack(): Adw.ViewStack {
        return this._forecastStack;
    }

    update(info: GWeather.Info): void {
        this._info = info;

        const label = Util.getNameAndCountry(info.location);
        this._placesButton.set_label(label.join(', '));

        this._worldView.refilter();

        this._conditionsImage.iconName = `${info.get_icon_name()}-large`;

        const [, tempValue] = info.get_value_temp(GWeather.TemperatureUnit.DEFAULT);
        this._temperatureLabel.label = '%d°'.format(Math.round(tempValue));

        const [, apparentValue] = info.get_value_apparent(GWeather.TemperatureUnit.DEFAULT);
        this._apparentLabel.label = _('Feels like %.0f°').format(apparentValue);
        this._apparentLabel.visible = apparentValue !== tempValue;

        this._forecastHourly.update(info);
        this._forecastDaily.update(info);

        if (this._updatedTimeTimeoutId)
            GLib.Source.remove(this._updatedTimeTimeoutId);

        this._updatedTime = Date.now();
        this._updatedTimeLabel.label = this._formatUpdatedTime();

        this._updatedTimeTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            UPDATED_TIME_TIMEOUT, () => {
                this._updatedTimeLabel.label = this._formatUpdatedTime();
                return GLib.SOURCE_CONTINUE;
            }
        );

        this._attributionLabel.label = info.get_attribution();
    }

    _formatUpdatedTime(): string {
        if (!this._updatedTime)
            return '';

        const milliseconds = Date.now() - this._updatedTime;

        const seconds = milliseconds / 1000;
        if (seconds < 60)
            return _('Updated just now.');

        const minutes = seconds / 60;
        if (minutes < 60)
            return ngettext(
                'Updated %d minute ago.',
                'Updated %d minutes ago.', minutes).format(minutes);

        const hours = minutes / 60;
        if (hours < 24)
            return ngettext(
                'Updated %d hour ago.',
                'Updated %d hours ago.', hours).format(hours);

        const days = hours / 24;
        if (days < 7)
            return ngettext(
                'Updated %d day ago.',
                'Updated %d days ago.', days).format(days);

        const weeks = days / 7;
        if (days < 30)
            return ngettext(
                'Updated %d week ago.',
                'Updated %d weeks ago.', weeks).format(weeks);

        const months = days / 30;
        return ngettext(
            'Updated %d month ago.',
            'Updated %d months ago.', months).format(months);
    }
};

WeatherWidget.set_layout_manager_type(Adw.ClampLayout.$gtype);

export class WeatherView extends Adw.Bin {
    _stack!: Gtk.Stack;
    _info?: GWeather.Info;
    _updateId?: number;
    _infoPage: WeatherWidget;

    static {
        GObject.registerClass({
            Template: 'resource:///org/gnome/Weather/city.ui',
            InternalChildren: ['stack']
        }, this);
    }

    constructor(application: WeatherApplication, window: MainWindow, params?: Partial<Adw.Bin.ConstructorProps>) {
        super(params);

        this._infoPage = new WeatherWidget(application, window);
        this._stack.add_named(this._infoPage, 'info');
    }

    get info(): GWeather.Info | undefined {
        return this._info;
    }

    set info(info) {
        if (this._updateId) {
            this._info?.disconnect(this._updateId);
            this._updateId = 0;

            this._infoPage.clear();
        }

        this._info = info;

        if (info) {
            this._stack.visible_child_name = 'loading';
            this._updateId = this._info?.connect('updated', (info) => {
                this._onUpdate(info)
            });

            if (info.is_valid()) {
                this._onUpdate(info);
            } else {
                info.update();
            }
        }
    }

    vfunc_map(): void {
        super.vfunc_map();
    }

    vfunc_unmap(): void {
        if (this._updateId) {
            this._info?.disconnect(this._updateId);
            this._updateId = 0;
        }

        super.vfunc_unmap();
    }

    update(): void {
        this._stack.visible_child_name = 'loading';
        this._infoPage.clear();
        if (this._info) {
            getApp()?.model?.updateInfo(this._info);
        }
    }

    _onUpdate(info: GWeather.Info): void {
        this._infoPage.clear();
        this._infoPage.update(info);
        this._stack.visible_child_name = 'info';
    }

    getForecastStack(): Adw.ViewStack {
        return this._infoPage.getForecastStack();
    }
};
