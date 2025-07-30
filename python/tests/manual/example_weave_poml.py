import poml
import weave
weave.init("intro-example")
poml.set_trace(["local", "weave"], tempdir="logs")
poml.poml("examples/102_render_xml.poml")