project('gnome-weather', 'c',
  version: '3.31.92',
  meson_version: '>= 0.46.0',
  license: 'GPL2+'
)

prefix = get_option('prefix')
i18n = import('i18n')
gnome = import('gnome')
application_id = 'org.gnome.Weather'
application_id_stable = 'org.gnome.Weather'

message('Looking for dependencies')
dependency('glib-2.0')
dependency('gobject-introspection-1.0', version: '>=1.35.9')
dependency('gtk+-3.0', version :'>=3.20')
dependency('gjs-1.0', version: '>= 1.50.0')
dependency('geoclue-2.0', version: '>= 0.12.99')
dependency('gweather-3.0', version: '>= 3.28')

env = environment()

EXTENSION_DIR = join_paths(get_option('prefix'), get_option('libdir'), meson.project_name())
DATA_DIR = join_paths(get_option('prefix'), get_option('datadir'), application_id)
BIN_DIR = join_paths(get_option('prefix'), get_option('bindir'))

# Profiles
if get_option('profile') == 'development'
  profile = 'Devel'
  name_suffix = ' (Development)'
else
  profile = ''
  name_suffix = ''
endif

conf = configuration_data()
conf.set('PACKAGE_URL', 'https://gitlab.gnome.org/GNOME/gnome-weather')
conf.set('DATA_DIR', DATA_DIR)

if get_option('profile') == 'development'
  conf.set('VERSION', ''.join([run_command(['git', 'describe', '--long', '--tags']).stdout(), get_option('profile')]))
else
  conf.set('VERSION', meson.project_version())
endif

conf.set_quoted('PROFILE', profile)

if get_option('profile') == 'development'
  application_id = 'org.gnome.WeatherDevel'
endif
conf.set('APP_ID', application_id)

subdir('data')
subdir('po')
subdir('src')
subdir('tests')

meson.add_install_script(
  'meson_post_install.py',
  join_paths(get_option('prefix'), get_option('datadir')),
  DATA_DIR,
  BIN_DIR,
)
