/* thermometer.js
 *
 * Copyright 2021 Vitaly Dyachkov <obyknovenius@me.com>
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

const GObject = imports.gi.GObject;
const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;
const Pango = imports.gi.Pango;
const Cairo = imports.cairo;

const Thermometer = GObject.registerClass({
  Properties: {
    'adjustment': GObject.ParamSpec.object(
      'adjustment',
      'Adjustment',
      'The GtkAdjustment that contains the current value of this thermometer object',
      GObject.ParamFlags.READWRITE,
      Gtk.Adjustment,
    ),
  },
  CssName: 'thermometer',
},class Thermometer extends Gtk.DrawingArea {

  _init(params) {
    super._init(params);

    const styleContext = this.get_style_context();

    const createStyleContext = (selector) => {
      const path = styleContext.get_path().copy();

      const pos = path.append_type(GObject.TYPE_NONE);
      path.iter_set_object_name(pos, selector);

      const context = Gtk.StyleContext.new();
      context.set_parent(styleContext);
      context.set_path(path);

      return context;
    }

    this._highStyleContext = createStyleContext('high');
    this._lowStyleContext = createStyleContext('low');

    this._radius = 12;
    this._margin = 12;
  }

  get adjustment() {
    return this._adjustment;
  }

  set adjustment(adjustment) {
    this._adjustment = adjustment;

    this._updatePangoLayouts(adjustment);
  }

  vfunc_get_preferred_width() {
    const [highWidth] = this._highLayout.get_pixel_size();
    const [lowWidth] = this._lowLayout.get_pixel_size();

    const width = Math.max(this._radius, highWidth, lowWidth);
    return [width, width];
  }

  vfunc_get_preferred_height() {
    const [, highHeight] = this._highLayout.get_pixel_size();
    const [, lowHeight] = this._lowLayout.get_pixel_size();

    const height = highHeight + this._maring + lowHeight;
    return [height, height];
  }

  _updatePangoLayouts(adjustment) {
    const value = adjustment.get_value();
    const pageSize = adjustment.get_page_size();

    const highLabel = Math.round(value + pageSize) + "°";
    this._highLayout = this._createPangoLayout(this._highStyleContext, highLabel);

    const lowLabel = Math.round(value) + "°";
    this._lowLayout = this._createPangoLayout(this._lowStyleContext, lowLabel);
  }

  _createPangoLayout(styleContext, text) {
    const context = this._createPangoContext(styleContext);
    const layout = Pango.Layout.new(context);

    layout.set_text(text, -1);

    return layout;
  }

  _createPangoContext(styleContext) {
    const display = this.get_display();
    const context = Gdk.pango_context_get_for_display(display);

    const font = styleContext.get_property('font', styleContext.get_state());
    context.set_font_description (font);

    return context;
  }

  vfunc_draw(cr) {
    const lower = this._adjustment.get_lower();
    const upper = this._adjustment.get_upper();
    const value = this._adjustment.get_value();
    const pageSize = this._adjustment.get_page_size();

    const width = this.get_allocated_width();
    const height = this.get_allocated_height();

    const [highWidth, highHeight] = this._highLayout.get_pixel_size();
    const [lowWidth, lowHeight] = this._lowLayout.get_pixel_size();

    const radius = this._radius;
    const margin = this._margin;

    const maxScaleHeight = height - highHeight - lowHeight - 2 * radius - 2 * margin;

    const factor = maxScaleHeight / (upper - lower);
    const scaleY = highHeight + radius + margin + (upper - value - pageSize) * factor;
    const scaleHeight = pageSize * factor;

    let highY = 0;
    let lowY = height - lowHeight;

    cr.save();

    if (maxScaleHeight > 0) {
      const gradient = this._createGradient(highHeight + margin, height - lowHeight - margin);
      cr.setSource(gradient);

      this._renderScale(cr, width / 2 - radius, scaleY, radius, scaleHeight);

      highY = scaleY - radius - margin - highHeight;
      lowY = scaleY + scaleHeight + radius + margin;
    }

    Gtk.render_layout(this._highStyleContext, cr,
                      width / 2 - highWidth / 2, highY,
                      this._highLayout);

    Gtk.render_layout(this._lowStyleContext, cr,
                      width / 2 - lowWidth / 2, lowY,
                      this._lowLayout);

    cr.restore();

    return false;
  }

  _renderScale(cr, x, y, radius, height) {
    cr.newSubPath();
    cr.arc(x + radius, y, radius, Math.PI, 0);
    cr.arc(x + radius, y + height, radius, 0, Math.PI);
    cr.closePath();
    cr.fill();
  }

  _createGradient(start, end) {
    const gradient = new Cairo.LinearGradient(0, start, 0, end);

    const styleContext = this.get_style_context();

    const [, warmColor] = styleContext.lookup_color('thermometer_warm_color');
    gradient.addColorStopRGB(0.0, warmColor.red, warmColor.green, warmColor.blue);

    const [, coldColor] = styleContext.lookup_color('thermometer_cold_color');
    gradient.addColorStopRGB(1.0, coldColor.red, coldColor.green, coldColor.blue);

    return gradient;
  }

});
