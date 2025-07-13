gnome = import('gnome')
podir = join_paths(meson.project_source_root(), 'po')


gnome.compile_resources(
  '@0@.data'.format(weather_id),
  '@0@.data.gresource.xml'.format(default_id),
  gresource_bundle: true,
  install_dir: weather_pkgdatadir,
  install: true
)

gnome.compile_resources(
  '@0@.BackgroundService.data'.format(weather_id),
  '@0@.BackgroundService.data.gresource.xml'.format(default_id),
  gresource_bundle: true,
  install_dir: weather_pkgdatadir,
  install: true
)

# Installing the schema file
install_data(
  default_id + '.gschema.xml',
  install_dir: join_paths(weather_datadir, 'glib-2.0', 'schemas')
)

# Building desktop file
msgfmt = find_program('msgfmt')
desktop_conf = configuration_data()
desktop_conf.set('APP_ID', weather_id)
desktop = custom_target(
  'desktop-file',
  input: configure_file(
    input: '@0@.desktop.in.in'.format(default_id),
    output: '@0@.desktop.in'.format(default_id),
    configuration: desktop_conf,
  ),
  output: '@0@.desktop'.format(weather_id),
  install: true,
  install_dir: join_paths(weather_datadir, 'applications'),
  command: [msgfmt, '--desktop',
    '--template', '@INPUT@', '-d', podir, '-o', '@OUTPUT@',
    '--keyword=X-Geoclue-Reason',
    '--keyword=Name', '--keyword=Comment', '--keyword=Keywords'
  ]
)

# Validating desktop file
desktop_file_validate = find_program('desktop-file-validate', required:false)
if desktop_file_validate.found()
  test (
    'Validate desktop file',
    desktop_file_validate,
    args: join_paths(meson.current_build_dir(), weather_id + '.desktop')
  )
endif

# Building app data
metainfo_conf = configuration_data()
metainfo_conf.set('app_id', weather_id)
metainfo = i18n.merge_file(
  input: configure_file(
    input: '@0@.metainfo.xml.in.in'.format(default_id),
    output: '@0@.metainfo.xml.in'.format(default_id),
    configuration: metainfo_conf
  ),
  output: '@0@.metainfo.xml'.format(weather_id),
  install: true,
  install_dir: join_paths(weather_datadir, 'metainfo'),
  po_dir: join_paths(meson.project_source_root(), 'po')
)

# Validating app data
appstreamcli = find_program('appstreamcli', required: false)
if appstreamcli.found()
  test(
    'Validate metainfo file',
    appstreamcli,
    args: ['validate', '--no-net', '--explain', metainfo]
  )
endif

service_conf = configuration_data()
service_conf.set('APP_ID', weather_id)
service_conf.set('DATA_DIR', weather_pkgdatadir)
service_conf.set('PROFILE', profile)
weather_servicedir = join_paths(weather_datadir, 'dbus-1', 'services')

configure_file(
  input: '@0@.service.in'.format(default_id),
  output: '@0@.service'.format(weather_id),
  configuration: service_conf,
  install: true,
  install_dir: weather_servicedir
)

configure_file(
  input: '@0@.BackgroundService.service.in'.format(default_id),
  output: '@0@.BackgroundService.service'.format(weather_id),
  configuration: service_conf,
  install: true,
  install_dir: weather_servicedir
)

# Search Provider
configure_file(
  input: '@0@.search-provider.ini.in'.format(default_id),
  output: '@0@.search-provider.ini'.format(weather_id),
  configuration: service_conf,
  install: true,
  install_dir: join_paths(weather_datadir, 'gnome-shell', 'search-providers')
)
subdir('icons')
