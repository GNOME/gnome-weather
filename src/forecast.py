
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

from gi.repository import GLib, Gtk, GWeather
import util, strings
from gettext import gettext as _

class ForecastBox(Gtk.Grid):
    """ Massage a list of GWeatherInfos to gather showable information """

    def __init__(self, **kw):
        super().__init__(orientation=Gtk.Orientation.HORIZONTAL,
                         column_spacing=24, column_homogeneous=True, **kw)

    def update(self, infos):
        # Compact multiple infos for the same day
        dates = list(map(lambda i: GLib.DateTime.new_from_unix_local(i.get_value_update()[1]), infos))

        subday = self._has_subday_resolution(dates)

        n = 0
        current = None
        for info in infos:
            # limit to 5 infos max
            if n > 5:
                break

            # only show forecasts if they're separated by
            # at least 6 hours
            ok, date = info.get_value_update()
            datetime = GLib.DateTime.new_from_unix_local(date)
            SIX_HOURS = 21600000000
            if current and datetime.difference(current) < SIX_HOURS:
                continue

            label = Gtk.Label(label='<b>' + self._get_date(datetime, subday) + '</b>',
                              use_markup=True, visible=True)
            self.attach(label, n, 0, 1, 1)

            image = Gtk.Image(icon_name=info.get_icon_name(),
                              icon_size=Gtk.IconSize.DIALOG, visible=True)
            self.attach(image, n, 1, 1, 1)

            temperature = Gtk.Label(label=self._get_temperature(info), visible=True)
            self.attach(temperature, n, 2, 1, 1)

            current = datetime
            n += 1

    def clear(self):
        self.foreach(lambda w, d: w.destroy(), None)

    def _has_subday_resolution(self, dates):
        if len(dates) == 1:
            return False

        # g_date_time_difference returns microseconds
        ONE_DAY = 86400000000
        if dates[1].difference(dates[0]) < ONE_DAY:
            return True
        else:
            return False

    def _get_date(self, datetime, subday):
        now = GLib.DateTime.new_now_local()
        tomorrow = now.add_days(1)

        if now.get_ymd() == datetime.get_ymd():
            if subday:
                return strings.format_today(datetime)
            else:
                return _("Today")
        elif tomorrow.get_ymd() == datetime.get_ymd():
            if subday:
                return strings.format_tomorrow(datetime)
            else:
                return _("Tomorrow")
        else:
            if subday:
                return strings.format_day_part(datetime)
            else:
                return datetime.format('%A')

    def _get_temperature(self, info):
        ok1, _ = info.get_value_temp_min(GWeather.TemperatureUnit.DEFAULT)
        ok2, _ = info.get_value_temp_max(GWeather.TemperatureUnit.DEFAULT)

        if ok1 and ok2:
            return "%s / %s" % (info.get_temp_min(), info.get_temp_max())
        else:
            return info.get_temp_summary()

