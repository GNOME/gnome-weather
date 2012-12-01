
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

from gi.repository import Gtk
from gettext import gettext as _

class ConditionsSidebar(Gtk.Grid):
    def __init__(self, **kw):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, **kw)
        self.get_style_context().add_class('white-background')

        title = Gtk.Label(label='<b>' + _("Current conditions:") + '</b>',
                          use_markup=True, xalign=0.0, wrap=True)
        self.add(title)

        self._conditions = Gtk.Label(xalign=0.0, wrap=True)
        self.add(self._conditions)

        self._temperature = Gtk.Label(xalign=0.0, wrap=True)
        self.add(self._temperature)

        self._wind = Gtk.Label(xalign=0.0, wrap=True)
        self.add(self._wind)

        self._attribution = Gtk.Label(use_markup=True, xalign=0.0, wrap=True,
                                      max_width_chars=30)
        self.add(self._attribution)

        self.show_all()

    def update(self, info):
        self._conditions.props.label = info.get_weather_summary()
        self._temperature.props.label = _("Temperature: ") + \
            info.get_temp_summary()
        self._wind.props.label = _("Wind: ") + info.get_wind()

        attr = info.get_attribution()
        if attr:
            self._attribution.props.label = attr
            self._attribution.show()
        else:
            self._attribution.hide()

