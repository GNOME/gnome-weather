source_conf = configuration_data()
source_conf.set('GJS', find_program('gjs').path())
source_conf.set('DATA_DIR', DATA_DIR)
source_conf.set('PACKAGE_VERSION', meson.project_version())
source_conf.set('libdir', EXTENSION_DIR)
source_conf.set('prefix', prefix)

application = configure_file(
	input: application_id_stable + '.Application.in',
	output: application_id + '.Application',
	configuration: source_conf,
	install: true,
	install_dir: DATA_DIR
)

configure_file(
	input: application_id_stable + '.BackgroundService.in',
	output: application_id + '.BackgroundService',
	configuration: source_conf,
	install: true,
	install_dir: DATA_DIR
)

application_sources = gnome.compile_resources(
	application_id_stable + '.Application.src',
	application_id_stable + '.Application.src.gresource.xml',
	gresource_bundle: true,
	install: true,
	install_dir: DATA_DIR
)

gnome.compile_resources(
	application_id_stable + '.BackgroundService.src',
	application_id_stable + '.BackgroundService.src.gresource.xml',
	gresource_bundle: true,
	install: true,
	install_dir: DATA_DIR
)

run_target('run',
  command: application,
  depends: application_sources
)
