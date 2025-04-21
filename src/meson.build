source_conf = configuration_data()
source_conf.set('GJS', gjs.get_variable(pkgconfig: 'gjs_console'))
source_conf.set('VERSION', meson.project_version() + version_suffix)
source_conf.set('APP_ID', weather_id)
source_conf.set('libdir', weather_extensiondir)
source_conf.set('prefix', weather_prefix)
source_conf.set('profile', profile)

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

tsc_out = meson.project_build_root() / 'tsc-out'

typescript = custom_target(
  'typescript-compile',
  build_by_default: true,
  build_always_stale: true,
  command: [ tsc, '--project', tsconfig, '--outDir', tsc_out ],
  output: ['tsc-output'],
)

application_sources = gnome.compile_resources(
  '@0@.src'.format(weather_id),
  configure_file(
    input: '@0@.src.gresource.xml.in'.format(default_id),
    output: '@0@.src.gresource.xml'.format(default_id),
    configuration: source_conf,
  ),
  dependencies: typescript,
  source_dir: tsc_out,
  gresource_bundle: true,
  install: true,
  install_dir: weather_pkgdatadir
)

gnome.compile_resources(
  '@0@.BackgroundService.src'.format(weather_id),
  configure_file(
    input: '@0@.BackgroundService.src.gresource.xml.in'.format(default_id),
    output: '@0@.BackgroundService.src.gresource.xml'.format(default_id),
    configuration: source_conf,
  ),
  dependencies: typescript,
  source_dir: tsc_out,
  gresource_bundle: true,
  install: true,
  install_dir: weather_pkgdatadir
)

run_target('run',
  command: application,
  depends: application_sources
)
