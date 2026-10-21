# quota-meter

A Claude mod that shows how much of your Claude plan you have used, how much remains, and when each limit resets.

It adds:

- an always-visible **band above the prompt**: one line per limit with a usage bar, used %, remaining %, and reset time with countdown;
- a **Claude quota** pane beside the chat, with one card per limit (5-hour session, weekly): a usage bar, used %, remaining %, and the reset countdown with its day and time;
- a **status line** entry, e.g. `5h 34% (2h 10m) · 7d 18% (4d 3h)`;
- a **`/quota`** command that reopens the pane and prints the same figures.

It reads the rate-limit windows the engine already receives with each response, so it needs no setup and makes no extra network calls. Figures appear after the first reply of a session.

## Install

At the prompt of a terminal session:

```
/plugin install quota-meter --marketplace Moka-78/quota-meter
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```
claude plugin install quota-meter --marketplace Moka-78/quota-meter
```

## License

MIT
