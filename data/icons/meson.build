datadir = join_paths('share', 'icons')
icondir = join_paths('hicolor', 'scalable', 'apps')
if get_option('profile') == 'development'
install_data (
	join_paths(icondir, 'org.gnome.Weather.svg'),
	install_dir: join_paths(datadir, icondir),
	rename: 'org.gnome.WeatherDevel.svg'
)
else
install_data (
	join_paths(icondir, 'org.gnome.Weather.svg'),
	install_dir: join_paths(datadir, icondir)
)
endif

icondir = join_paths('hicolor', 'symbolic', 'apps')
if get_option('profile') == 'development'
install_data (
	join_paths(icondir, 'org.gnome.Weather-symbolic.svg'),
	install_dir: join_paths(datadir, icondir),
	rename: 'org.gnome.WeatherDevel-symbolic.svg'
)
else
install_data (
	join_paths(icondir, 'org.gnome.Weather-symbolic.svg'),
	install_dir: join_paths(datadir, icondir)
)
endif
