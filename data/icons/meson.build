scalable_icondir = join_paths('hicolor', 'scalable', 'apps')
install_data (
  join_paths(scalable_icondir, 'org.gnome.Weather.svg'),
  install_dir: join_paths(weather_datadir, 'icons', scalable_icondir),
  rename: '@0@.svg'.format(weather_id)
)

symbolic_icondir = join_paths('hicolor', 'symbolic', 'apps')
install_data (
  join_paths(symbolic_icondir, 'org.gnome.Weather-symbolic.svg'),
  install_dir: join_paths(weather_datadir, 'icons', symbolic_icondir),
  rename: '@0@-symbolic.svg'.format(weather_id)
)
