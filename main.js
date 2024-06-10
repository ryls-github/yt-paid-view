import { html, render } from "https://esm.sh/lit-html@3.1.3"
import sheet from "./main.css" with { type: "css" }

document.adoptedStyleSheets.push(sheet)
const root = document.getElementById("root")

const update = () => {
	render(view(), root)
}

const skip = Symbol("SKIP")

const $ = (fn) => (event) => {
	const promise = fn(event)
	if (promise === skip) return

	if (promise instanceof Promise) {
		promise.then(value => {
			if (value === skip) return
			update()
		})
	} else {
		update()
	}
}

const utils = {
	validate: (data) => {
		return Array.isArray(data) && data.every(item => {
			return !!(typeof item.yen === "number"
				&& typeof item.channel === "string"
				&& item.day.match(/^\d{4}\/\d{2}\/\d{2}$/))
		})
	},
	filter: (items, filter) => {
		const from = filter.from ? new Date(`${filter.from} 00:00:00`) : null
		const to = filter.to ? new Date(`${filter.to} 00:00:00`) : null

		return items.filter(item => {
			const date = new Date(`${item.day} 00:00:00`)
			if (from && (from > date)) {
				return false
			}
			if (to && (to < date)) {
				return false
			}
			if (filter.channel && (item.channel !== filter.channel)) {
				return false
			}
			return true
		})
	},
	sort: (rows, sort) => {
		return rows.toSorted((a, b) => {
			if (a[sort.column] < b[sort.column]) return sort.order === "asc" ? -1 : 1
			if (a[sort.column] > b[sort.column]) return sort.order === "asc" ? 1 : -1
			return 0
		})
	},
	num: (n) => {
		return (+n).toLocaleString()
	},
	dateFormat: (d, sep = "-") => {
		const date = new Date(d)
		return [
			date.getFullYear(),
			String(date.getMonth() + 1).padStart(2, "0"),
			String(date.getDate()).padStart(2, "0"),
		].join(sep)
	}
}

const values = {
	json: "",
	data: null,
	filter: {
		from: "",
		to: "",
		channel: "",
	},
	sort: {
		base: { column: "day", order: "desc" },
		day: { column: "day", order: "asc" },
		month: { column: "month", order: "asc" },
		channel: { column: "yen", order: "desc" },
	},
	help: false,
	help_get_code: null,
}

const handlers = {
	onDrop: $(async (event) => {
		event.preventDefault()
		const file = event.dataTransfer.files[0]
		if (file && file.type === "application/json") {
			values.json = await file.text()
		}
	}),
	onOK: $(() => {
		let data
		try {
			data = JSON.parse(values.json || "[]")
		} catch (err) {
			alert(`JSON が読み取れません\n${err.message}`)
			return
		}
		if (!utils.validate(data)) {
			alert("読み取った JSON データのフォーマットが不正です")
			return
		}

		values.data = data
		values.filter = {
			from: "",
			to: "",
			channel: "",
		}
	}),
	onInputFilter: $((event) => {
		values.filter[event.target.name] = event.target.value
	}),
	onShowHelp: $(async () => {
		if (values.help_get_code) return
		values.help_get_code = fetch("get.js").then(res => res.text()).then(
			result => result,
			(err) => {
				console.error(err)
				return "(取得に失敗しました)"
			}
		)
		values.help_get_code = await values.help_get_code
	}),
	onClickHeader: (sort, column) => $(() => {
		if (sort.column === column) {
			sort.order = sort.order === "asc" ? "desc" : "asc"
		} else {
			sort.column = column
			sort.order = "asc"
		}
	}),
	onClickSelect: (col, val) => $((event) => {
		if (!event.ctrlKey) {
			values.filter = {
				from: "",
				to: "",
				channel: "",
			}
		}

		if (col === "day") {
			const day = utils.dateFormat(val)
			values.filter.from = day
			values.filter.to = day
		} else if (col === "month") {
			const start = new Date(val)
			start.setDate(1)
			const end = new Date(start)
			end.setMonth(end.getMonth() + 1)
			end.setDate(0)
			values.filter.from = utils.dateFormat(start)
			values.filter.to = utils.dateFormat(end)
		} else if (col === "channel") {
			values.filter.channel = val
		}
	}),
	filterReset: $(() => {
		values.filter = {
			from: "",
			to: "",
			channel: "",
		}
	}),
}

const view = () => views.main()

const views = {
	main: () => {
		if (values.help) {
			return views.help()
		} else if (values.data) {
			return views.viewer()
		} else {
			return views.entrance()
		}
	},
	entrance: () => {
		return html`
			<div class="entrance">
				<div class="main">
					<textarea
						.value=${values.json}
						@input=${$(e => values.json = e.target.value)}
						@dragover=${event => event.preventDefault()}
						@drop=${handlers.onDrop}
					></textarea>
					<div class="btns">
						<button @click=${handlers.onOK}>OK</button>
						<button @click=${$(() => values.help = true)}>？</button>
					</div>
				</div>
			</div>
		`
	},
	help: () => {
		setTimeout(() => {
			handlers.onShowHelp()
		}, 0)
		return html`
			<div class="help">
				<div class="header">
					<button @click=${$(() => values.help = false)}>◀</button>
				</div>
				<div class="main">
					<h1>【ヘルプ】</h1>
					<p>YouTube の購入履歴を見やすく表示するページです</p>
					<p>ヘッダーのコントロールで日付やチャンネルでフィルタできます</p>
					<p>テーブルのヘッダーをクリックしてテーブルの並び順を変更できます</p>
					<p>テーブルの行をクリックしてそれをフィルタに入力できます<br/>
					1 つの行に選択可能なフィルタが複数ある場合は行ではなくセルごとにクリックを判定します<br/>
					Ctrl キーを押しながらクリックするとフィルタは置き換えではなく追加になります</p>
					<p>開始方法：<br/>
					YouTube の<a href="https://www.youtube.com/paid_memberships" target="_blank">購入履歴画面</a>
					を開いて下のコードをコンソールに貼り付けると必要なデータが JSON 形式でクリップボードにコピーされます<br/>
					その内容をこのページの入力欄に貼り付けます</p>
					${typeof values.help_get_code === "string"
						? html`<textarea .value=${values.help_get_code} class="help-get-code" readonly></textarea>`
						: html`<p>LOADING...</p>`
					}
				</div>
			</div>
		`
	},
	viewer: () => {
		const data = utils.filter(values.data, values.filter)
		const yen = data.reduce((a, b) => a + b.yen, 0)
		const total_yen = values.data.reduce((a, b) => a + b.yen, 0)
		const channels = new Set([...values.data.map(item => item.channel)])

		const by_day = [...Map.groupBy(data, row => row.day)]
			.map(([k, v]) => {
				return { day: k, yen: v.reduce((a, b) => a + b.yen, 0) }
			})
		const by_month = [...Map.groupBy(data, row => row.day.slice(0, 7))]
			.map(([k, v]) => {
				return { month: k, yen: v.reduce((a, b) => a + b.yen, 0) }
			})
		const by_channel = [...Map.groupBy(data, row => row.channel)]
			.map(([k, v]) => {
				return { channel: k, yen: v.reduce((a, b) => a + b.yen, 0) }
			})

		const counts = [
			`日付: ${by_day.length}`,
			`月: ${by_month.length}`,
			`チャンネル: ${by_channel.length}`,
		].join("\n")

		return html`
			<div class="viewer">
				<div class="header">
					<div>
						<button @click=${$(() => values.data = null)}>◀</button>
						<div>
							<input type="date" name="from" .value=${values.filter.from} @input=${handlers.onInputFilter}>
							～
							<input type="date" name="to" .value=${values.filter.to} @input=${handlers.onInputFilter}>
						</div>
						<select name="channel" @input=${handlers.onInputFilter}>
							<option></option>
							${[...channels].map(channel => {
								return html`
									<option .selected=${channel === values.filter.channel}>
										${channel}
									</option>
								`
							})}
						</select>
						<button @click=${handlers.filterReset}>✕</button>
					</div>
					<div>
						<div class="info">¥${utils.num(yen)} / ¥${utils.num(total_yen)}</div>
						<div class="info" title=${counts}>${data.length} / ${values.data.length}</div>
						<button @click=${$(() => values.help = true)}>？</button>
					</div>
				</div>
				<div class="grid">
					<div>
						${views.table({
							cols: [
								{ column: "day", label: "日付", selectable: true },
								{ column: "channel", label: "チャンネル", selectable: true },
								{ column: "yen", label: "￥", formatter: utils.num },
							],
							rows: data,
							primary_col: null,
							sort: values.sort.base,
						})}
					</div>
					<div>
						${views.table({
							cols: [
								{ column: "day", label: "日付" },
								{ column: "yen", label: "￥", formatter: utils.num },
							],
							rows: by_day,
							primary_col: "day",
							sort: values.sort.day,
						})}
					</div>
					<div>
						${views.table({
							cols: [
								{ column: "channel", label: "チャンネル" },
								{ column: "yen", label: "￥", formatter: utils.num },
							],
							rows: by_channel,
							primary_col: "channel",
							sort: values.sort.channel,
						})}
					</div>
					<div>
						${views.table({
							cols: [
								{ column: "month", label: "月" },
								{ column: "yen", label: "￥", formatter: utils.num },
							],
							rows: by_month,
							primary_col: "month",
							sort: values.sort.month,
						})}
					</div>
				</div>
			</div>
		`
	},
	table: ({ cols, rows, primary_col, sort }) => {
		const soted_rows = utils.sort(rows, sort)
		return html`
			<table>
				<thead>
					<tr>
						${cols.map(col => {
							const order_class = sort.column === col.column ? sort.order : ""

							return html`
								<th
									class=${`${order_class} ${col.column}`}
									@click=${handlers.onClickHeader(sort, col.column)}
								>
									${col.label}
								</th>
							`
						})}
					</tr>
				</thead>
				<tbody>
					${soted_rows.map(row => {
						const rowHandler = primary_col
							? handlers.onClickSelect(primary_col, row[primary_col])
							: null
						return html`
							<tr @click=${rowHandler}>
								${cols.map(col => {
									const val = row[col.column]
									const fval = col.formatter ? col.formatter(val) : val
									const handler = (primary_col || !col.selectable)
										? null
										: handlers.onClickSelect(col.column, val)
									return html`
										<td
											class=${col.column}
											@click=${handler}
										>
											${fval}
										</td>
									`
								})}
							</tr>
						`
					})}
				</tbody>
			</table>
		`
	},
}

update()
