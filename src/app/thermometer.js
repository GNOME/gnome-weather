/* thermometer.js
 *
 * Copyright 2021-2022 Vitaly Dyachkov <obyknovenius@me.com>
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
import Gdk from 'gi://Gdk';
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

const ThermometerScale = GObject.registerClass({
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

    minHeight = 64;
    radius = 12;

    constructor({ range = null, ...params }) {
        super(params);

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

        if (!this.range)
            return;

        const { width, height } = this.get_allocation();

        // Don't render when allocation is shorter than the minimal height
        if (height < this.minHeight)
            return;

        const { dailyHigh, dailyLow, weeklyHigh, weeklyLow } = this.range;

        const radius = this.radius;
        const factor = (height - 2 * radius) / (weeklyHigh - weeklyLow);

        const gradientWidth = 2 * radius;
        const gradientHeight = factor * (dailyHigh - dailyLow);

        const x = (width - gradientWidth) / 2;
        const y = radius + factor * (weeklyHigh - dailyHigh);

        const bounds = new Graphene.Rect();
        bounds.init(x, y - radius, gradientWidth, gradientHeight + 2 * radius);

        const outline = new Gsk.RoundedRect();
        outline.init_from_rect(bounds, radius);

        snapshot.push_rounded_clip(outline);

        const [, warmColor] = this.get_style_context()
            .lookup_color('weather_thermometer_warm_color');

        const [, coolColor] = this.get_style_context()
            .lookup_color('weather_thermometer_cold_color');

        snapshot.append_linear_gradient(
            bounds,
            new Graphene.Point({ x: x + gradientWidth / 2, y: 0 }),
            new Graphene.Point({ x: x + gradientWidth / 2, y: height }),
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
    Properties: {
        'range': GObject.ParamSpec.jsobject(
            'range',
            'range',
            'The TemperatureRange instance representing this thermometer scale',
            GObject.ParamFlags.READWRITE,
        ),
    },
}, class Thermometer extends Gtk.Widget {

    #highLabel;
    #lowLabel;
    #scale;

    spacing = 18;

    constructor({ ...params }) {
        super(params);

        this.#highLabel = new Gtk.Label({
            css_classes: ['high', 'body'],
        });
        this.#highLabel.set_parent(this);

        this.#lowLabel = new Gtk.Label({
            css_classes: ['low', 'body'],
        });
        this.#lowLabel.set_parent(this);

        this.#scale = new ThermometerScale({});
        this.#scale.set_parent(this);
    }

    vfunc_measure(orientation, for_size) {
        const [highMin, highNat, highMinBaseline, highNatBaseline] =
            this.#highLabel.measure(orientation, for_size);

        const [lowMin, lowNat, lowMinBaseline, lowNatBaseline] =
            this.#lowLabel.measure(orientation, for_size);

        if (orientation === Gtk.Orientation.HORIZONTAL) {
            return [
                Math.max(highMin, lowMin),
                Math.max(highNat, lowNat),
                Math.max(highMinBaseline, lowMinBaseline),
                Math.max(highNatBaseline, lowNatBaseline)
            ];
        } else {
            const spacing = this.spacing;
            return [
                highMin + spacing + lowMin,
                highNat + spacing + lowNat,
                highMinBaseline + spacing + lowMinBaseline,
                highNatBaseline + spacing + lowNatBaseline
            ];
        }
    }

    vfunc_size_allocate(width, height, baseline) {
        const [highMin, highNat] = this.#highLabel.get_preferred_size();
        const [lowMin, lowNat] = this.#lowLabel.get_preferred_size();

        const spacing = this.spacing;

        const scaleHeight = Math.max(
            0,
            height - (highNat.height + lowNat.height) - 2 * spacing);

        const scaleRect = new Gdk.Rectangle({
            height: scaleHeight,
            width,
            x: 0,
            y:highNat.height + spacing,
        });
        this.#scale.size_allocate(scaleRect, -1);

        let highY = 0;
        let lowY = height - lowNat.height;

        if (scaleHeight >= this.#scale.minHeight) {
            const { dailyHigh, dailyLow, weeklyHigh, weeklyLow } = this.range;

            const radius = this.#scale.radius;
            const factor = (scaleHeight - 2 * radius) / (weeklyHigh - weeklyLow);

            highY += (weeklyHigh - dailyHigh) * factor;
            lowY -= (dailyLow - weeklyLow) * factor;
        }

        const highRect = new Gdk.Rectangle({
            height: highNat.height,
            width: highNat.width,
            x: (width - highNat.width) / 2,
            y: highY,
        });
        this.#highLabel.size_allocate(highRect, -1);

        const lowRect = new Gdk.Rectangle({
            height: lowNat.height,
            width: lowNat.width,
            x: (width - lowNat.width) / 2,
            y: lowY,
        });
        this.#lowLabel.size_allocate(lowRect, -1);
    }

    vfunc_root() {
        super.vfunc_root();

        this.bind_property('range', this.#scale,'range', GObject.BindingFlags.DEFAULT);

        this.bind_property_full('range', this.#lowLabel, 'label', GObject.BindingFlags.DEFAULT, (_, range) => {
            return [!!range, Util.formatTemperature(range?.dailyLow) ?? ''];
        }, null);

        this.bind_property_full('range', this.#highLabel, 'label', GObject.BindingFlags.DEFAULT, (_, range) => {
            return [!!range, Util.formatTemperature(range?.dailyHigh) ?? ''];
        }, null);
    }
});

