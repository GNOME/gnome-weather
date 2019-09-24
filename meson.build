project('gnome-weather', 'c',
  version: '3.34.0',
  meson_version: '>= 0.50.0',
  license: 'GPL2+'
)

i18n = import('i18n')
gnome = import('gnome')

dependency('glib-2.0')
dependency('gobject-introspection-1.0', version: '>=1.35.9')
dependency('gtk+-3.0', version :'>=3.20')
dependency('gjs-1.0', version: '>= 1.50.0')
dependency('geoclue-2.0', version: '>= 0.12.99')
dependency('gweather-3.0', version: '>= 3.28')

# Profiles
if get_option('profile') == 'development'
  profile = 'Devel'
  vcs_tag = run_command('git', 'rev-parse', '--short', 'HEAD').stdout().strip()
  if vcs_tag == ''
    version_suffix = '-devel'
  else
    version_suffix = '-@0@'.format (vcs_tag)
  endif
else
  profile = ''
  version_suffix = ''
endif

default_id = 'org.gnome.Weather'
weather_id = default_id + profile

weather_prefix = get_option('prefix')
weather_libdir = join_paths(weather_prefix, get_option('libdir'))
weather_extensiondir = join_paths(weather_libdir, meson.project_name())
weather_datadir = join_paths(weather_prefix, get_option('datadir'))
weather_pkgdatadir = join_paths(weather_datadir, weather_id)
weather_bindir = join_paths(weather_prefix, get_option('bindir'))

subdir('data')
subdir('po')
subdir('src')
subdir('tests')

meson.add_install_script(
  'meson_post_install.py',
  weather_datadir,
  weather_pkgdatadir,
  weather_bindir,
  weather_id
)
