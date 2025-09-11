project('gnome-weather', 'c',
  version: '49.0',
  meson_version: '>= 0.59.0',
  license: 'GPL-2.0-or-later'
)

i18n = import('i18n')
gnome = import('gnome')

dependency('glib-2.0')
dependency('gobject-introspection-1.0', version: '>=1.35.9')
dependency('gtk4', version :'>=4.5')
gjs = dependency('gjs-1.0', version: '>= 1.71.0')
dependency('libgeoclue-2.0', version: '>= 0.12.99')
dependency('libadwaita-1', version: '>=  1.4.alpha')
dependency('gweather4', version: '>= 3.90.0')

# Profiles
if get_option('profile') == 'development'
  profile = 'Devel'
  vcs_tag = run_command(
    ['git', 'rev-parse', '--short', 'HEAD'],
    check: true
  ).stdout().strip()
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

tsc = find_program('tsc', required: true)
tsconfig = files('tsconfig.json')

subdir('data')
subdir('po')
subdir('src')
subdir('tests')

meson.add_install_script(
  'meson_post_install.py',
  weather_pkgdatadir,
  weather_bindir,
  weather_id
)

gnome.post_install(
  gtk_update_icon_cache: true,
  glib_compile_schemas: true,
  update_desktop_database: true,
)
