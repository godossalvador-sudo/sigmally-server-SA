# sig-server
This is a fork of [OgarII](https://github.com/Luka967/OgarII) which implements [Sigmally](https://sigmally.com)'s
custom protocol and its settings (Sigmally uses OgarII with few modifications).

I haven't gotten around to making this very user-friendly, so in the meantime this is more of a personal repository.

I might add my own features to this in the future (such as time control).

## Connecting
You need either [Sigmally Fixes](https://greasyfork.org/en/scripts/483587-sigmally-fixes-v2) or
[Delta](https://deltav4.glitch.me/). Other clients that support the legacy protocol will probably work too.

To connect with Sigmally Fixes, go to __https://one.sigmally.com?ip=ws://localhost/sigmally.com__.

To connect with Delta, put `ws://localhost` in the server IP box, which will use the legacy protocol. To use the
Sigmally protocol, put in `ws://localhost/sigmally.com`.
