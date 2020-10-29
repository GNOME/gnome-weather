if profile == 'Devel'
  icon = '@0@.svg'.format(weather_id)
else
  icon = '@0@.svg'.format(default_id)
endif

scalable_icondir = join_paths('hicolor', 'scalable', 'apps')
install_data (
  join_paths(scalable_icondir, icon),
  install_dir: join_paths(weather_datadir, 'icons', scalable_icondir)
)

symbolic_icondir = join_paths('hicolor', 'symbolic', 'apps')
install_data (
  join_paths(symbolic_icondir, 'org.gnome.Weather-symbolic.svg'),
  install_dir: join_paths(weather_datadir, 'icons', symbolic_icondir),
  rename: '@0@-symbolic.svg'.format(weather_id)
)

status_icondir = join_paths('hicolor', 'scalable', 'status')
install_subdir (
  status_icondir,
  install_dir: join_paths(weather_datadir, 'icons', status_icondir),
  strip_directory: true
)
