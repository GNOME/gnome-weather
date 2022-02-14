/* thermometer.js
 *
 * Copyright 2021 Vitaly Dyachkov <obyknovenius@me.com>
 * Copyright 2022 Evan Welsh <contact@evanwelsh.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Graphene from 'gi://Graphene';
import Gsk from 'gi://Gsk';

import * as Util from '../misc/util.js';

export class TemperatureRange {
  dailyLow;
  dailyHigh;
  weeklyLow;
  weeklyHigh;

  constructor({ dailyLow, dailyHigh, weeklyLow, weeklyHigh }) {
    this.dailyLow = dailyLow;
    this.dailyHigh = dailyHigh;
    this.weeklyLow = weeklyLow;
    this.weeklyHigh = weeklyHigh;
  }
}

GObject.registerClass({
  CssName: 'WeatherThermometerScale',
  Properties: {
    'range': GObject.ParamSpec.jsobject(
      'range',
      'range',
      'The TemperatureRange instance representing this thermometer scale',
      GObject.ParamFlags.READWRITE,
    ),
  },
}, class ThermometerScale extends Gtk.Widget {

  constructor({ range = null, ...params }) {
    super({
      vexpand: true,
      halign: Gtk.Align.FILL,
      overflow: Gtk.Overflow.HIDDEN,
      ...params
    });

    this.range = range;
  }

  vfunc_map() {
    super.vfunc_map();

    this._rangeChangedId = this.connect('notify::range', () => {
      this.queue_draw();
    });
  }

  vfunc_unmap() {
    this.disconnect(this._rangeChangedId);

    super.vfunc_unmap();
  }

  vfunc_snapshot(snapshot) {
    super.vfunc_snapshot(snapshot);

    if (!this.range) return;

    const { width, height } = this.get_allocation();

    // Don't render when allocation is shorter than 64
    if (height < 64) return;

    const { dailyHigh, dailyLow, weeklyHigh, weeklyLow } = this.range;

    const scaleFactor = height / (weeklyHigh - weeklyLow);

    const scaleWidth = 24;
    const scaleHeight = scaleFactor * (dailyHigh - dailyLow);
    const scaleRadius = 12;

    const x = (width - scaleWidth) / 2;
    const y = scaleFactor * (weeklyHigh - dailyHigh);

    const bounds = new Graphene.Rect();
    bounds.init(x, y, scaleWidth, scaleHeight);

    const outline = new Gsk.RoundedRect();
    outline.init_from_rect(bounds, scaleRadius);

    snapshot.push_rounded_clip(outline);

    const [, warmColor] = this.get_style_context().lookup_color('weather_thermometer_warm_color');
    const [, coolColor] = this.get_style_context().lookup_color('weather_thermometer_cold_color');

    snapshot.append_linear_gradient(
      bounds,
      new Graphene.Point({ x: x + scaleWidth / 2, y: 0 }),
      new Graphene.Point({ x: x + scaleWidth / 2, y: height }),
      [
        new Gsk.ColorStop({ offset: 0.0, color: warmColor }),
        new Gsk.ColorStop({ offset: 1.0, color: coolColor })
      ]
    );

    snapshot.pop();
  }
});

export const Thermometer = GObject.registerClass({
  CssName: 'WeatherThermometer',
  Template: GLib.Uri.resolve_relative(import.meta.url, './thermometer.ui', 0),
  InternalChildren: ['scale', 'highLabel', 'lowLabel'],
  Properties: {
    'range': GObject.ParamSpec.jsobject(
      'range',
      'range',
      'The TemperatureRange instance representing this thermometer scale',
      GObject.ParamFlags.READWRITE,
    ),
  },
}, class Thermometer extends Gtk.Widget {
  constructor({ ...params }) {
    super(params);

    Object.assign(this.layoutManager, {
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 20
    });
  }

  vfunc_root() {
    super.vfunc_root();

    this.bind_property('range', this._scale, 'range', GObject.BindingFlags.DEFAULT);

    this.bind_property_full('range', this._lowLabel, 'label', GObject.BindingFlags.DEFAULT, (_, range) => {
      return [!!range, Util.formatTemperature(range?.dailyLow) ?? ''];
    }, null);

    this.bind_property_full('range', this._highLabel, 'label', GObject.BindingFlags.DEFAULT, (_, range) => {
      return [!!range, Util.formatTemperature(range?.dailyHigh) ?? ''];
    }, null);
  }
});

Thermometer.set_layout_manager_type(Gtk.BoxLayout);
