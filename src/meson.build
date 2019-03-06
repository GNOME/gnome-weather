source_conf = configuration_data()
source_conf.set('GJS', find_program('gjs').path())
source_conf.set('VERSION', meson.project_version())
source_conf.set('APP_ID', weather_id)
source_conf.set('libdir', weather_extensiondir)
source_conf.set('prefix', weather_prefix)

application = configure_file(
  input: '@0@.in'.format(default_id),
  output: weather_id,
  configuration: source_conf,
  install: true,
  install_dir: weather_pkgdatadir
)

configure_file(
  input: '@0@.BackgroundService.in'.format(default_id),
  output: '@0@.BackgroundService'.format(weather_id),
  configuration: source_conf,
  install: true,
  install_dir: weather_pkgdatadir
)

application_sources = gnome.compile_resources(
  '@0@.src'.format(default_id),
  '@0@.src.gresource.xml'.format(default_id),
  gresource_bundle: true,
  install: true,
  install_dir: weather_pkgdatadir
)

gnome.compile_resources(
  '@0@.BackgroundService.src'.format(default_id),
  '@0@.BackgroundService.src.gresource.xml'.format(default_id),
  gresource_bundle: true,
  install: true,
  install_dir: weather_pkgdatadir
)

run_target('run',
  command: application,
  depends: application_sources
)
