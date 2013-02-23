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

const Conditions = imports.conditions;
const Forecast = imports.forecast;
const Util = imports.util;

const WeatherView = new Lang.Class({
    Name: 'WeatherView',
    Extends: GtkClutter.Embed,

    _init: function(params) {
        let filtered = Params.filter(params, { info: null });
        params = Params.fill(params, { use_layout_size: true });
        this.parent(params);

        let iconBin = new GtkClutter.Actor();
        iconBin.add_constraint(new Clutter.AlignConstraint({ align_axis: Clutter.AlignAxis.BOTH,
                                                             factor: 0.5,
                                                             source: this.get_stage() }));
        this.get_stage().add_actor(iconBin);

        this._icon = new Gtk.Image({ pixel_size: 256,
                                     visible: true });
        iconBin.get_widget().get_style_context().add_class('white-background');
        iconBin.get_widget().add(this._icon);

        let currentBox = new GtkClutter.Actor({ margin_right:15,
                                                margin_top:15 });
        currentBox.add_constraint(new Clutter.AlignConstraint({ align_axis: Clutter.AlignAxis.X_AXIS,
                                                                factor: 1.0,
                                                                source: this.get_stage() }));
        currentBox.add_constraint(new Clutter.AlignConstraint({ align_axis: Clutter.AlignAxis.Y_AXIS,
                                                                factor: 0.0,
                                                                source: this.get_stage() }));
        this.get_stage().add_actor(currentBox);
        this._conditions = new Conditions.ConditionsSidebar();
        currentBox.get_widget().add(this._conditions);
        currentBox.get_widget().get_style_context().add_class('white-background');

        let forecastsBin = new GtkClutter.Actor({ margin_bottom: 10,
                                                  margin_left: 5,
                                                  margin_right: 5 });
        forecastsBin.add_constraint(new Clutter.AlignConstraint({ align_axis: Clutter.AlignAxis.Y_AXIS,
                                                                  factor: 1.0,
                                                                  source: this.get_stage() }));
        forecastsBin.add_constraint(new Clutter.BindConstraint({ coordinate: Clutter.BindCoordinate.WIDTH,
                                                                 source: this.get_stage() }));
        this.get_stage().add_actor(forecastsBin);
        this._forecasts = new Forecast.ForecastBox();
        forecastsBin.get_widget().add(this._forecasts)
        forecastsBin.get_widget().get_style_context().add_class('white-background')

        let [ok, color] = Clutter.Color.from_string('#a0a0a0');
        this._overlay = new Clutter.Actor({ background_color: color });
        this._overlay.add_constraint(new Clutter.BindConstraint({ coordinate: Clutter.BindCoordinate.ALL,
                                                                  source: this.get_stage() }));
        this._overlay.show();
        this.get_stage().add_actor(this._overlay);

        this._info = filtered.info;
        this._updateId = this._info.connect('updated',
                                            Lang.bind(this, this._onUpdate));
    },

    vfunc_destroy: function() {
        if (this._updateId) {
            this._info.disconnect(this._updateId);
            this._updateId = 0;
        }

        this.parent();
    },

    beginUpdate: function() {
        this._forecasts.clear();
        this._overlay.show();
        this._overlay.opacity = 255;
    },

    _onUpdate: function(info) {
        this._overlay.save_easing_state();
        this._overlay.opacity = 0;
        this._overlay.restore_easing_state();

        this._conditions.update(info);

        this._icon.icon_name = info.get_icon_name();

        let forecasts = info.get_forecast_list();
        if (forecasts.length > 0) {
            this._forecasts.update(forecasts);
            this._forecasts.show();
        } else {
            this._forecasts.hide();
        }
    }
});
