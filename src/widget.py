
# Copyright (c) 2012 Giovanni Campagna <scampa.giovanni@gmail.com>
#
# Gnome Weather is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by the
# Free Software Foundation; either version 2 of the License, or (at your
# option) any later version.
#
# Gnome Weather is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
# or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
# for more details.
#
# You should have received a copy of the GNU General Public License along
# with Gnome Weather; if not, write to the Free Software Foundation,
# Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

from gi.repository import GLib, Gio, GObject, Clutter, Gtk, GtkClutter, GWeather
import util
from forecast import ForecastBox
from conditions import ConditionsSidebar
from gettext import gettext as _

class LocationEntryItem(Gtk.ToolItem):
    def __init__(self, world, location=None, is_important=True, **kw):
        super().__init__(is_important=is_important, **kw)

        self._locationbar = GWeather.LocationEntry(top=world,
                                                   location=location,
                                                   visible=True, hexpand=True)
        self._locationbar.connect('notify::location', self._locationbar_changed)

        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, visible=True)
        box.pack_start(Gtk.Label(label=_("Location: "), visible=True), False, False, 0)
        box.pack_start(self._locationbar, True, True, 0)

        self.set_expand(True)
        self.add(box)

    def get_location(self):
        return self._locationbar.get_location()

    location = GObject.property(type=GWeather.Location, getter=get_location)

    def _locationbar_changed(self, entry, pspec):
        self.notify('location')

class WeatherWidget(GtkClutter.Embed):
    def __init__(self, info, visible=True, **kw):
        super().__init__(visible=visible, use_layout_size=True, **kw)

        self._build_ui()
        self.info = None
        self.set_info(info)

    def set_info(self, info):
        if self.info:
            self.info.disconnect(self._updated_id)

        self.info = info
        if info:
            self._updated_id = info.connect('updated', self.on_updated)
            #self.begin_update()
            info.update()

    def destroy(self):
        self.set_info(None)
        super().destroy()

    def begin_update(self):
        self._forecasts.clear()
        self._overlay.show()
        self._overlay.props.opacity = 255

    def _build_ui(self):
        icon_bin = GtkClutter.Actor()
        icon_bin.add_constraint(Clutter.AlignConstraint(align_axis=Clutter.AlignAxis.BOTH,
                                                        factor=0.5, source=self.get_stage()))
        self.get_stage().add_actor(icon_bin)
        self._icon = Gtk.Image(pixel_size=256, visible=True)
        icon_bin.get_widget().get_style_context().add_class('white-background')
        icon_bin.get_widget().add(self._icon)

        current_box = GtkClutter.Actor(margin_right=15, margin_top=15)
        current_box.add_constraint(Clutter.AlignConstraint(align_axis=Clutter.AlignAxis.X_AXIS,
                                                           factor=1.0, source=self.get_stage()))
        current_box.add_constraint(Clutter.AlignConstraint(align_axis=Clutter.AlignAxis.Y_AXIS,
                                                           factor=0.0, source=self.get_stage()))
        self.get_stage().add_actor(current_box)
        self._conditions = ConditionsSidebar()
        current_box.get_widget().add(self._conditions)
        current_box.get_widget().get_style_context().add_class('white-background')

        forecasts_bin = GtkClutter.Actor(margin_bottom=10, margin_left=5, margin_right=5)
        forecasts_bin.add_constraint(Clutter.AlignConstraint(align_axis=Clutter.AlignAxis.Y_AXIS,
                                                             factor=1.0, source=self.get_stage()))
        forecasts_bin.add_constraint(Clutter.BindConstraint(coordinate=Clutter.BindCoordinate.WIDTH,
                                                            source=self.get_stage()))
        self.get_stage().add_actor(forecasts_bin)
        self._forecasts = ForecastBox()
        forecasts_bin.get_widget().add(self._forecasts)
        forecasts_bin.get_widget().get_style_context().add_class('white-background')

        self._overlay = Clutter.Actor(background_color=util.clutter_color_from_string('#a0a0a0'))
        self._overlay.add_constraint(Clutter.BindConstraint(coordinate=Clutter.BindCoordinate.ALL,
                                                            source=self.get_stage()))
        self._overlay.show()
        self._overlay.set_position(0, 0)
        self._overlay.set_size(400, 400)
        self.get_stage().add_actor(self._overlay)

    def on_updated(self, info):
        self._overlay.save_easing_state()
        self._overlay.props.opacity = 0
        self._overlay.restore_easing_state()

        self._conditions.update(info)

        self._icon.props.icon_name = info.get_icon_name()

        forecasts = info.get_forecast_list()
        if len(forecasts) > 0:
            self._forecasts.update(forecasts)
            self._forecasts.show()
        else:
            self._forecasts.hide()
