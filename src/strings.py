
# Copyright (c) 2012 Giovanni Campagna <scampa.giovanni@gmail.com>
#
# Gnome Weather is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by the
# Free Software Foundation; either version 2 of the License, or (at your
# option) any later version.
#
# Gnome Clocks is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
# or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
# for more details.
#
# You should have received a copy of the GNU General Public License along
# with Gnome Weather; if not, write to the Free Software Foundation,
# Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

from gettext import gettext
def N_(x): return x

day_parts = [
    (N_("Monday night"), N_("Monday morning"), N_("Monday afternoon"), N_("Monday evening")),
    (N_("Tuesday night"), N_("Tuesday morning"), N_("Tuesday afternoon"), N_("Tuesday evening")),
    (N_("Wednesday night"), N_("Wednesday morning"), N_("Wednesday afternoon"), N_("Wednesday evening")),
    (N_("Thursday night"), N_("Thursday morning"), N_("Thursday afternoon"), N_("Thursday evening")),
    (N_("Friday night"), N_("Friday morning"), N_("Friday afternoon"), N_("Friday evening")),
    (N_("Saturday night"), N_("Saturday morning"), N_("Saturday afternoon"), N_("Saturday evening")),
    (N_("Sunday night"), N_("Sunday morning"), N_("Sunday afternoon"), N_("Sunday evening")),
]

today_parts = (N_("This night"), N_("This morning"), N_("This afternoon"), N_("This evening"))
tomorrow_parts = (N_("Tomorrow night"), N_("Tomorrow morning"), N_("Tomorrow afternoon"), N_("Tomorrow evening"))

def _get_datetime_part(datetime):
    h = datetime.get_hour()

    if h < 6 or h >= 21:
        return 0
    elif h < 12:
        return 1
    elif h < 18:
        return 2
    else:
        return 3

def format_today(datetime):
    part = _get_datetime_part(datetime)
    return gettext(today_parts[part])

def format_tomorrow(datetime):
    part = _get_datetime_part(datetime)
    return gettext(tomorrow_parts[part])

def format_day_part(datetime):
    day = datetime.get_day_of_week() - 1
    part = _get_datetime_part(datetime)

    return gettext(day_parts[day][part])
