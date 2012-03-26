
from gi.repository import GLib, Gio, GObject, Clutter, Gtk, GtkClutter, GWeather, GWeatherUI
import util
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

class ForecastActor(Clutter.Actor):
    def __init__(self, info, margin_left=5, margin_right=5, **kw):
        super().__init__(margin_left=margin_left, margin_right=margin_right, **kw)

        self.info = info

        layout = Clutter.BoxLayout(vertical=True)
        self.props.layout_manager = layout

        ok, date = self.info.get_value_update()
        if ok:
            datetime = GLib.DateTime.new_from_unix_local(date)
            datelabel = Clutter.Text(text=datetime.format("<b>%A</b>"),
                                     use_markup=True)
            layout.pack(datelabel, True, True, False, Clutter.BoxAlignment.START, Clutter.BoxAlignment.START)
        else:
            raise ValueError("Invalid GWeather.Info (has no update time)")

        image = Clutter.Actor(content=GWeatherUI.util_load_gicon_to_clutter(Gio.ThemedIcon(name=info.get_icon_name()),
                                                                            48),
                              width=48, height=48)
        layout.pack(image, True, False, False, Clutter.BoxAlignment.CENTER, Clutter.BoxAlignment.CENTER)

        # TRANSLATORS: this holds the minimum and maximum forecasted temperatures
        temp = Clutter.Text(text=_("%s / %s") % (info.get_temp_min(), info.get_temp_max()))
        layout.pack(temp, True, True, False, Clutter.BoxAlignment.START, Clutter.BoxAlignment.END)

class WeatherWidget(GtkClutter.Embed):
    def __init__(self, info, visible=True, **kw):
        super().__init__(visible=visible, **kw)

        self._build_ui()
        self.info = None
        self.set_info(info)

    def set_info(self, info):
        if self.info:
            self.info.disconnect(self._updated_id)

        self.info = info
        if info:
            self._updated_id = info.connect('updated', self.on_updated)
            info.update()

    def destroy(self):
        self.set_info(None)
        super().destroy()

    def begin_update(self):
        self._forecasts.destroy_all_children()
        self._overlay.props.opacity = 255

    def _build_ui(self):
        self._icon = Clutter.Actor(width=256, height=256)
        self._icon.add_constraint(Clutter.AlignConstraint(align_axis=Clutter.AlignAxis.BOTH,
                                                          factor=0.5,
                                                          source=self.get_stage()))

        self.get_stage().add_actor(self._icon)

        current_box = Clutter.Actor(margin_right=15, margin_top=15)
        current_box.add_constraint(Clutter.AlignConstraint(align_axis=Clutter.AlignAxis.X_AXIS,
                                                          factor=1.0,
                                                          source=self.get_stage()))
        current_box.add_constraint(Clutter.AlignConstraint(align_axis=Clutter.AlignAxis.Y_AXIS,
                                                          factor=0.0,
                                                          source=self.get_stage()))
        self.get_stage().add_actor(current_box)
        layout = Clutter.BoxLayout(vertical=True, )
        current_box.props.layout_manager = layout

        title = Clutter.Text(text='<b>' + _("Current conditions:") + '</b>',
                             use_markup=True)
        layout.pack(title, True, True, False, Clutter.BoxAlignment.START, Clutter.BoxAlignment.START)

        self._conditions = Clutter.Text()
        layout.pack(self._conditions, True, True, False, Clutter.BoxAlignment.START, Clutter.BoxAlignment.START)

        self._temperature = Clutter.Text()
        layout.pack(self._temperature, True, True, False, Clutter.BoxAlignment.START, Clutter.BoxAlignment.START)

        self._wind = Clutter.Text()
        layout.pack(self._wind, True, True, False, Clutter.BoxAlignment.START, Clutter.BoxAlignment.START)

        self._forecasts = Clutter.Actor(margin_bottom=10, margin_left=5, margin_right=5)
        self._forecasts.add_constraint(Clutter.AlignConstraint(align_axis=Clutter.AlignAxis.Y_AXIS,
                                                              factor=1.0,
                                                              source=self.get_stage()))
        self._forecasts.add_constraint(Clutter.BindConstraint(coordinate=Clutter.BindCoordinate.WIDTH,
                                                             source=self.get_stage()))
        self._forecasts.props.layout_manager = Clutter.BoxLayout()
        self.get_stage().add_actor(self._forecasts)

        self._overlay = Clutter.Actor(background_color=util.clutter_color_from_string('#a0a0a0'))
        self._overlay.add_constraint(Clutter.BindConstraint(coordinate=Clutter.BindCoordinate.ALL,
                                                           source=self.get_stage()))
        self.get_stage().add_actor(self._overlay)

    def on_updated(self, info):
        self._overlay.save_easing_state()
        self._overlay.props.opacity = 0
        self._overlay.restore_easing_state()

        icon = info.get_icon_name()
        self._icon.props.content = GWeatherUI.util_load_gicon_to_clutter(Gio.ThemedIcon(name=icon), 256)

        self._conditions.props.text = info.get_weather_summary()
        self._temperature.props.text = _("Temperature: ") + info.get_temp_summary()
        self._wind.props.text = _("Wind: ") + info.get_wind()

        l = info.get_forecast_list()
        for i in range(min(len(l), 6)):
            self._forecasts.add_actor(ForecastActor(l[i]))
