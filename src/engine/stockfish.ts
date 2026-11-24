import { players } from "@/context/analyze";
import { BISHOP, Chess, Color, KNIGHT, Move, PAWN, PieceSymbol, QUEEN, ROOK, Square, WHITE } from "chess.js";
import { SetStateAction } from "react";

export type result = '1-0' | '0-1' | '1/2-1/2' | '*' | ''

export type position = ({
    square: Square,
    type: PieceSymbol,
    color: Color,
} | null)[][]

export type square = {
    row: number,
    col: number,
}

export type moveRating = "forced" | "brilliant" | "great" | "best" | "excellent" | "good" | "book" | "inaccuracy" | "mistake" | "miss" | "blunder"

export interface move {
    fen: string,
    movement?: square[],
    bestMove?: square[],
    bestMoveSan?: string,
    moveRating?: moveRating,
    comment?: string,
    color: Color,
    capture?: PieceSymbol,
    castle?: 'k' | 'q',
    san?: string,
    sacrifice?: boolean,
    previousStaticEvals?: string[][],
}

export interface openings {
    [key: string]: string,
}

const COMMENTS = {
    brilliant: [
        'You found a brilliant way to sacrifice a piece.',
        'This sacrifice showcases a deep understanding of the position.',
        'A bold and exceptional sacrifice to gain a strategic edge.',
    ],
    great: [
        "You capitalized on your opponent's mistake effectively.",
        "This move takes full advantage of your opponent's error.",
        "A strong response to punish your opponent's oversight.",
    ],
    best: [
        'This has been the best move in this position.',
        'This was the most optimal move you could play here.',
        'The most precise and effective move for this scenario.',
    ],
    excellent: [
        'This was not the absolute best move, but it is just as strong.',
        'An excellent move that fits the demands of the position perfectly. It is not the best though.',
        'A top-tier choice, even if not the single best move.',
    ],
    good: [
        'This is not among the best moves, but it is still acceptable.',
        'An acceptable move, but there were better options.',
        'This move works, but it misses stronger alternatives.',
    ],
    inaccuracy: [
        'This move causes you to lose some advantage.',
        'This move weakens your overall position.',
        'An avoidable slip that leads to a worse situation.',
    ],
    blunder: [
        'This move loses significant advantage.',
        'This move significantly worsens your position.',
        'This move severely harms your position.',
    ],
    mate: [
        'Delivering checkmate is always a satisfying move.',
        'Checkmating your opponent is the ultimate goal.',
        'A decisive and final move to end the game.',
    ],
    mateIn: [
        'This is the right move to force an eventual checkmate.',
        'A precise move that guarantees a checkmate in the near future.',
        'This move sets up an unstoppable sequence to deliver checkmate.',
    ],
    delayMate: [
        'This move delays a checkmate, but your opponent is still being checkmated.',
        "You slowed down the checkmate sequence, but it's still guaranteed.",
        'A move that postpones the unavoidable checkmate you are delivering.',
    ],
    advanceMate: [
        "This decision shortens the path to your opponent's victory.",
        'You hastened the process of being checkmated with this move.',
        'This move brings your opponent closer to delivering checkmate.',
    ],
    loseAdvantage: [
        'This move causes you to lose the advantage you had.',
        'A costly error that sacrifices your winning edge.',
        'This move shifts the position from advantageous to equal or worse.',
    ],
    giveAdvantage: [
        'This move turns an equal position into a losing one.',
        'A mistake that hands the advantage to your opponent.',
        'This move creates a clear advantage for your opponent.',
    ],
    gettingMated: [
        'This move leads to an eventual forced checkmate by your opponent.',
        'A fatal error that guarantees your opponent will checkmate you.',
        'This move sets up an inevitable checkmate against you.',
    ],
    missMate: [
        'You missed an opportunity to force a checkmate, allowing your opponent to escape.',
        'A chance to secure a decisive checkmate was overlooked with this move.',
        'This move lets your opponent avoid a checkmate you could have forced.',
    ],
    missAdvantage: [
        'You missed an opportunity to gain an advantage.',
        'A key chance to improve your position was lost.',
        'This move overlooks a way to strengthen your position.',
    ],
    forced: [
        'There were no alternatives; this was the only possible move.',
        'You had no choice but to play this move.',
        'The situation left you with just one legal option, and this was it.',
    ]
}

export async function prepareStockfish(stockfish: Worker) {
    await engineResponse(stockfish, "uci", line => line === "uciok", undefined, 15000)
    stockfish.postMessage("setoption name Hash value 32")
    await waitTillReady(stockfish)
}

export function invertColor(color: Color): Color {
    return color === 'w' ? 'b' : 'w'
}

function getRandomNumber(number: number) {
    return Math.floor(Math.random() * number)
}

function getPlayers(headers: Record<string, string>) {
    const NO_NAME = 'Unknown'
    const NO_ELO = 'NOELO'

    const whiteName = headers.White ?? NO_NAME
    const blackName = headers.Black ?? NO_NAME

    const whiteElo = headers.WhiteElo ?? NO_ELO
    const blackElo = headers.BlackElo ?? NO_ELO

    return [{ name: whiteName, elo: whiteElo }, { name: blackName, elo: blackElo }]
}

function getTime(headers: Record<string, string>) {
    const base = headers.TimeControl?.match(/^(\d+)(?:\+\d+)?$/)
    return base ? Number(base[1]) : 0
}

function getResult(headers: Record<string, string>): result {
    const value = headers.Result
    return value === "1-0" || value === "0-1" || value === "1/2-1/2" || value === "*" ? value : ""
}

export function formatSquare(square: string): square {
    const letters = 'abcdefgh'.split('')

    const col = letters.indexOf(square[0])
    const row = Number(square[1]) - 1

    return { col, row }
}

export function deformatSquare(square: square) {
    const letters = 'abcdefgh'.split('')

    return `${letters[square.col]}${square.row + 1}`
}

function formatMove(evaluation: string) {
    const line = evaluation.split('\n').filter(line => line.startsWith('bestmove'))[0]
    const move = line?.split(/\s+/)[1]
    if (move === '(none)') return { }

    const movement = move ? [move.slice(0, 2), move.slice(2, 4)].map(square => {
        const { col, row } = formatSquare(square)

        return { col, row }
    }) : undefined

    const coronation = move ? move[4] as PieceSymbol : undefined

    return { movement, coronation }
}

function engineResponse(
    engine: Worker,
    command: string,
    complete: (line: string) => boolean,
    signal?: AbortSignal,
    timeoutMs = 30000,
) {
    signal?.throwIfAborted()
    return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => fail(new Error("Stockfish timed out")), timeoutMs)

        function cleanup() {
            clearTimeout(timer)
            engine.removeEventListener("message", receive)
            engine.removeEventListener("error", engineError)
            signal?.removeEventListener("abort", abort)
        }

        function fail(error: Error) {
            cleanup()
            reject(error)
        }

        function engineError() {
            fail(new Error("Stockfish could not run"))
        }

        function abort() {
            engine.postMessage("stop")
            fail(new Error("canceled"))
        }

        function receive(event: MessageEvent) {
            for (const line of String(event.data).split("\n")) {
                if (!complete(line.trim())) continue
                cleanup()
                resolve()
                return
            }
        }

        engine.addEventListener("message", receive)
        engine.addEventListener("error", engineError)
        signal?.addEventListener("abort", abort, { once: true })
        engine.postMessage(command)
    })
}

async function getBestMove(program: Worker, depth: number, signal: AbortSignal) {
    let staticEval: string[] | undefined
    let result: ReturnType<typeof formatMove> | undefined
    await engineResponse(program, `go depth ${depth}`, line => {
        const score = line.match(/\bscore (cp|mate) (-?\d+)/)
        if (line.startsWith("info ") && score && !/\b(?:upperbound|lowerbound)\b/.test(line)) {
            staticEval = score.slice(1, 3)
        }
        if (!line.startsWith("bestmove ")) return false
        result = formatMove(line)
        return true
    }, signal)
    if (!result?.movement || !staticEval) throw new Error("Stockfish did not return a playable move")
    return { bestMove: result.movement, coronation: result.coronation, staticEval }
}

function getMoveRating(staticEval: string[], previousStaticEvals: string[][], bestMoveSan: string, moveSan: string, fen: string, color: Color, sacrifice: boolean, previousSacrice: boolean, openings: openings): { comment: string, moveRating: moveRating } {
    if (previousStaticEvals[0] === undefined) previousStaticEvals[0] = []
    if (previousStaticEvals[1] === undefined) previousStaticEvals[1] = []
    if (previousStaticEvals[2] === undefined) previousStaticEvals[2] = []
    if (previousStaticEvals[3] === undefined) previousStaticEvals[3] = []

    const winning = Number(staticEval[1]) < 0
    const previousWinig = Number(previousStaticEvals[0][1]) > 0

    const previousColor = invertColor(color)

    function getRandomCommentNumber() {
        return getRandomNumber(3)
    }

    const commentNumber = getRandomCommentNumber()

    function getStandardRating(diff: number) {
        let rating: moveRating = 'excellent'
        if (diff >= 0.4) rating = 'good'
        if (diff >= 0.8) rating = 'inaccuracy'
        if (diff >= 4) rating = 'blunder'

        return rating
    }

    function losingGeatAdvantage(evaluation: number, previousEvaluation: number, color: Color) {
        const GREAT_ADVANTAGE = 2

        if (color === "w") {
            return previousEvaluation >= GREAT_ADVANTAGE && evaluation < GREAT_ADVANTAGE
        } else {
            return previousEvaluation <= -GREAT_ADVANTAGE && evaluation > -GREAT_ADVANTAGE
        }
    }

    function givingGeatAdvantage(evaluation: number, previousEvaluation: number, color: Color) {
        const GREAT_ADVANTAGE = -2

        if (color === "w") {
            return previousEvaluation >= GREAT_ADVANTAGE && evaluation < GREAT_ADVANTAGE
        } else {
            return previousEvaluation <= -GREAT_ADVANTAGE && evaluation > -GREAT_ADVANTAGE
        }
    }

    function keepMating(mateIn: number, previousMateIn: number, color: Color) {
        if (color === "w") {
            return mateIn < previousMateIn
        } else {
            return mateIn > previousMateIn
        }
    }

    function advanceMate(mateIn: number, previousMateIn: number, color: Color) {
        if (color === "w") {
            return mateIn > previousMateIn
        } else {
            return mateIn < previousMateIn
        }
    }

    function getPreviousStaticEvalAmount(number: number) {
        const checkColor = number % 2 === 0 ? 'b' : 'w'
        return Number(previousStaticEvals[number][1]) / 100 * (color === checkColor ? -1 : 1)
    }

    const staticEvalAmount = Number(staticEval[1]) / 100 * (color === 'w' ? -1 : 1)

    function getWasNotMateRelated(number: number) {
        return previousStaticEvals[number][0] !== 'mate' && previousStaticEvals[number + 1][0] !== 'mate'
    }

    const isNotMateRelated = staticEval[0] !== 'mate' && previousStaticEvals[0][0] !== 'mate'

    // book
    const openingName = openings[fen]
    if (openingName) return { moveRating: 'book', comment: openingName }

    // standard
    function getPreviousStandardRating(number: number) {
        return getStandardRating(getPreviousEvaluationDiff(number))
    }

    function getPreviousEvaluationDiff(number: number) {
        const checkColor = number % 2 === 0 ? 'b' : 'w'
        return color === checkColor ? getPreviousStaticEvalAmount(number + 1) - getPreviousStaticEvalAmount(number) : getPreviousStaticEvalAmount(number) - getPreviousStaticEvalAmount(number + 1)
    }

    const evaluationDiff = color === "w" ? getPreviousStaticEvalAmount(0) - staticEvalAmount : staticEvalAmount - getPreviousStaticEvalAmount(0)
    const standardRating = getStandardRating(evaluationDiff)

    const previousMistake = getWasNotMateRelated(0) && getWasNotMateRelated(1) && getPreviousStandardRating(0) === "inaccuracy" && getPreviousEvaluationDiff(0) >= 1.2 && (losingGeatAdvantage(getPreviousStaticEvalAmount(0), getPreviousStaticEvalAmount(1), previousColor) || givingGeatAdvantage(getPreviousStaticEvalAmount(0), getPreviousStaticEvalAmount(1), previousColor))
    const previousPreviousMistake = getWasNotMateRelated(1) && getWasNotMateRelated(2) && getPreviousStandardRating(1) === "inaccuracy" && getPreviousEvaluationDiff(1) >= 1.2 && (losingGeatAdvantage(getPreviousStaticEvalAmount(1), getPreviousStaticEvalAmount(2), color) || givingGeatAdvantage(getPreviousStaticEvalAmount(1), getPreviousStaticEvalAmount(2), color))

    const previousMiss =
    (
        getWasNotMateRelated(0)
        &&
        (previousPreviousMistake || getPreviousStandardRating(1) === "blunder")
        &&
        (getPreviousStandardRating(0) === "blunder" || getPreviousStandardRating(0) === "inaccuracy")
        &&
        (getPreviousEvaluationDiff(0) <= getPreviousEvaluationDiff(1) + 0.5)
    )

    // brilliant - sacrifice
    const previousBrilliant = getWasNotMateRelated(0) && previousSacrice && getPreviousStandardRating(0) === 'excellent'
    if (
        !previousBrilliant
        &&
        isNotMateRelated
        &&
        standardRating === 'excellent'
        &&
        sacrifice
        &&
        (
            getPreviousStandardRating(0) === 'inaccuracy' || getPreviousStandardRating(0) === 'blunder'
            ||
            (
                !(getPreviousStandardRating(1) === 'inaccuracy' || getPreviousStandardRating(1) === 'blunder')
                &&
                (getPreviousStandardRating(2) === 'inaccuracy' || getPreviousStandardRating(2) === 'blunder')
            )
        )
    ) return { moveRating: 'brilliant', comment: COMMENTS.brilliant[commentNumber] }

    // brilliant - start mate
    if (sacrifice && previousStaticEvals[0][0] !== 'mate' && staticEval[0] === 'mate' && winning) return { moveRating: 'brilliant', comment: COMMENTS.brilliant[commentNumber] }

    // brilliant - right move to mate
    if (sacrifice && previousStaticEvals[0][0] === 'mate' && staticEval[0] === 'mate' && keepMating(staticEvalAmount, getPreviousStaticEvalAmount(0), color) && winning) return { moveRating: 'brilliant', comment: COMMENTS.brilliant[commentNumber] }

    // great - gaining advantage
    if (
        !previousMiss
        &&
        getWasNotMateRelated(0)
        &&
        isNotMateRelated
        &&
        standardRating === 'excellent'
        &&
        (previousMistake || getPreviousStandardRating(0) === 'blunder')
    ) return { moveRating: 'great', comment: COMMENTS.great[commentNumber] }

    // best
    const isBest = bestMoveSan === moveSan
    if (isBest && staticEval[0] === 'mate' && !staticEval[1]) return { moveRating: 'best', comment: COMMENTS.mate[commentNumber] }

    if (isBest) return { moveRating: 'best', comment: COMMENTS.best[commentNumber] }

    // excellent - mate
    if (staticEval[0] === 'mate' && !staticEval[1]) return { moveRating: 'excellent', comment: COMMENTS.mate[commentNumber] }

    // excellent - start mate
    if (previousStaticEvals[0][0] !== 'mate' && staticEval[0] === 'mate' && winning) return { moveRating: 'excellent', comment: COMMENTS.mateIn[commentNumber] }

    // excellent - right move to mate
    if (previousStaticEvals[0][0] === 'mate' && staticEval[0] === 'mate' && keepMating(staticEvalAmount, getPreviousStaticEvalAmount(0), color) && winning) return { moveRating: 'excellent', comment: COMMENTS.mateIn[commentNumber] }

    // good - delay mate
    if (previousStaticEvals[0][0] === 'mate' && staticEval[0] === 'mate' && !keepMating(staticEvalAmount, getPreviousStaticEvalAmount(0), color) && winning) return { moveRating: 'good', comment: COMMENTS.delayMate[commentNumber] }

    // good - advance mate
    if (previousStaticEvals[0][0] === 'mate' && staticEval[0] === 'mate' && advanceMate(staticEvalAmount, getPreviousStaticEvalAmount(0), color) && !winning) return { moveRating: 'good', comment: COMMENTS.advanceMate[commentNumber] }

    // miss - mate
    if (previousStaticEvals[0][0] === 'mate' && staticEval[0] !== 'mate' && previousWinig) return { moveRating: 'miss', comment: COMMENTS.missMate[commentNumber] }

    // miss - gain advantage
    if (
        !previousMiss
        &&
        isNotMateRelated
        &&
        (previousMistake || getPreviousStandardRating(0) === 'blunder')
        &&
        (standardRating === "blunder" || standardRating === "inaccuracy")
        &&
        (evaluationDiff <= getPreviousEvaluationDiff(0) + 0.5)
    ) return { moveRating: 'miss', comment: COMMENTS.missAdvantage[commentNumber] }

    // mistake - lose advantage
    if (isNotMateRelated && standardRating === "inaccuracy" && evaluationDiff >= 1.2 && losingGeatAdvantage(staticEvalAmount, getPreviousStaticEvalAmount(0), color)) return { moveRating: 'mistake', comment: COMMENTS.loseAdvantage[commentNumber] }

    // mistake - give advantage
    if (isNotMateRelated && standardRating === "inaccuracy" && evaluationDiff >= 1.2 && givingGeatAdvantage(staticEvalAmount, getPreviousStaticEvalAmount(0), color)) return { moveRating: 'mistake', comment: COMMENTS.giveAdvantage[commentNumber] }

    // mistake - mate
    if (previousStaticEvals[0][0] !== 'mate' && staticEval[0] === 'mate' && !winning && (color === WHITE ? getPreviousStaticEvalAmount(0) <= -2 : getPreviousStaticEvalAmount(0) >= 2)) return { moveRating: 'mistake', comment: COMMENTS.gettingMated[commentNumber] }

    // blunder - mate
    if (
        (previousStaticEvals[0][0] !== 'mate' && staticEval[0] === 'mate' && !winning)
        ||
        (previousStaticEvals[0][0] === 'mate' && staticEval[0] === 'mate' && !winning && previousWinig)
    ) return { moveRating: 'blunder', comment: COMMENTS.gettingMated[commentNumber] }

    return { moveRating: standardRating, comment: COMMENTS[standardRating][commentNumber] }
}

async function analyze(program: Worker, fen: string, depth: number, signal: AbortSignal) {
    signal.throwIfAborted()
    program.postMessage(`position fen ${fen}`)
    const { bestMove, staticEval, coronation } = await getBestMove(program, depth, signal)
    return { bestMove, staticEval, bestMoveCoronation: coronation }
}

function getAttackersDefenders(chess: Chess, color: Color, to: Square) {
    const attackers = chess.attackers(to, invertColor(color))
    const legalAttackers = attackers.filter(attacker => chess.moves({ verbose: true }).findIndex(move => move.from === attacker && move.to === to) !== -1)
    const legalAttackersPieces = legalAttackers.map(attacker => chess.get(attacker))

    let defenders, legalDefenders, legalDefendersPieces
    if (attackers.length === 1) {
        const testChess = new Chess(chess.fen())
        try {
            testChess.move({ from: attackers[0], to })
        } catch { }

        defenders = testChess.attackers(to, color)
        legalDefenders = defenders.filter(defender => {
            if (testChess.moves({ verbose: true }).findIndex(move => move.from === defender && move.to === to) === -1) {
                return false
            }
            return true
        })
        legalDefendersPieces = legalDefenders.map(defender => chess.get(defender))
    } else {
        defenders = chess.attackers(to, color)
        legalDefenders = defenders.filter(defender => {
            for (const attacker of legalAttackers) {
                const testChess = new Chess(chess.fen())
                try {
                    testChess.move({ from: attacker, to: to })
                } catch { }
    
                if (testChess.moves({ verbose: true }).findIndex(move => move.from === defender && move.to === to) === -1) {
                    return false
                }
            }
            return true
        })
        legalDefendersPieces = legalDefenders.map(defender => chess.get(defender))
    }

    return { attackers: { squares: legalAttackers, pieces: legalAttackersPieces, length: legalAttackers.length }, defenders: { squares: legalDefenders, pieces: legalDefendersPieces, length: legalDefenders.length } }
}

function couldBeSaved(chess: Chess, square: Square, color: Color) {
    if (!chess.attackers(square, color).length) {
        for (const move of chess.moves({ verbose: true })) {
            if (move.from !== square) return true
        }
    } else {
        for (const move of chess.moves({ verbose: true, square: square })) {
            const testChess = new Chess(move.after)
            if (!testChess.attackers(move.to, color).length) return true
        }
    }

    return false
}

function isSacrifice(move: Move) {
    const chess = new Chess(move.after)
    const chessBefore = new Chess(move.before)

    const sacrifying: {
        square: Square,
        type: PieceSymbol,
        color: Color,
    }[] = []

    const board = chess.board()
    for (const row of board) {
        for (const square of row) {
            if (!square || square.type === PAWN) continue
            if (square.color !== move.color) continue

            const { attackers, defenders } = getAttackersDefenders(chess, move.color, square.square)

            if (!defenders.length && attackers.length && (!move.captured || move.captured === PAWN)) {
                sacrifying.push(square)
                continue
            }
            if ((square.type === KNIGHT || square.type === BISHOP) && !move.captured && attackers.pieces.findIndex(piece => piece?.type === PAWN) !== -1) {
                sacrifying.push(square)
                continue
            }
            if (square.type === ROOK && attackers.length && (move.captured !== ROOK && move.captured !== QUEEN) && !(attackers.length === 1 && (attackers.pieces[0]?.type === QUEEN || attackers.pieces[0]?.type === ROOK) && defenders.length) && !(defenders.length && (move.captured === KNIGHT || move.captured === BISHOP))) {
                sacrifying.push(square)
                continue
            }
            if (square.type === QUEEN && attackers.length && move.captured !== QUEEN && !(attackers.length === 1 && attackers.pieces[0]?.type === QUEEN && defenders.length) && !(attackers.length === 1 && attackers.pieces[0]?.type === ROOK && move.captured === ROOK && defenders.length)) {
                sacrifying.push(square)
                continue
            }
        }
    }

    for (const square of sacrifying) {
        const beforeSquare = chessBefore.get(square.square)?.color === chess.get(square.square)?.color && chessBefore.get(square.square)?.type === chess.get(square.square)?.type ? square.square : move.from

        if (couldBeSaved(chessBefore, beforeSquare, invertColor(move.color))) return true
    }

    return false
}

function isForced(move: Move) {
    const chess = new Chess(move.before)

    return chess.moves().length === 1
}

function cleanStockfish(stockfish: Worker) {
    stockfish.postMessage("stop")
    stockfish.postMessage("ucinewgame")
}

function waitTillReady(engine: Worker, signal?: AbortSignal) {
    return engineResponse(engine, "isready", line => line === "readyok", signal, 15000)
}

function clearPgn(pgn: string) {
    // remove comments
    return pgn.replace(/^%.*/gm, '')
}

export function moveToSan(move: square[], coronation: PieceSymbol | undefined, fen: string) {
    if (!move.length) return ""

    try {
        const chess = new Chess(fen)
        const moveObject = chess.move({ from: deformatSquare(move[0]), to: deformatSquare(move[1]), promotion: coronation })
        return moveObject.san
    } catch {
        return ""
    }
}

export function getCastle(san: string) {
    return san === 'O-O' ? 'k' : san === 'O-O-O' ? 'q' : undefined
}

export async function parseMove(stockfish: Worker, depth: number, move: Move, chess: Chess, previousStaticEvals: string[][], previousBestMoveSan: string | undefined, previousSacrifice: boolean, openings: openings, signal: AbortSignal): Promise<move> {
    signal.throwIfAborted()
    const movement: square[] = [move.from, move.to].map(square => {
        const { col, row } = formatSquare(square)

        return { col, row }
    })

    const fen = move.after
    chess.load(fen)

    const color = invertColor(move.color)
    const capture = move.captured
    const san = move.san

    const castle = getCastle(move.san)

    let sacrifice, staticEval: string[], bestMove: square[] | undefined, forced, bestMoveCoronation
    if (chess.isCheckmate()) {
        sacrifice = false
        staticEval = ["mate"]
        bestMove = undefined
        forced = false
        bestMoveCoronation = undefined
    } else if (chess.isDraw()) {
        sacrifice = false
        staticEval = ["cp", "0"]
        forced = isForced(move)
    } else {
        sacrifice = move.promotion ? false : isSacrifice(move)
        ;({ staticEval, bestMove, bestMoveCoronation } = await analyze(stockfish, move.after, depth, signal))
        forced = isForced(move)
    }

    const { moveRating, comment } = forced ? { moveRating: 'forced', comment: COMMENTS.forced[getRandomNumber(3)] } as { moveRating: moveRating, comment: string } : getMoveRating(staticEval, previousStaticEvals, previousBestMoveSan ?? "", move.san, move.after, move.color, sacrifice, previousSacrifice, openings)

    if (chess.isGameOver()) bestMove = undefined

    const bestMoveSan = bestMove ? moveToSan(bestMove, bestMoveCoronation, fen) : undefined

    const newPreviousStaticEval = [staticEval, ...previousStaticEvals]

    return {
        color,
        capture,
        san,
        castle,
        moveRating,
        comment,
        bestMove,
        bestMoveSan,
        fen,
        sacrifice,
        movement,
        previousStaticEvals: newPreviousStaticEval,
    }
}

export async function parsePosition(stockfish: Worker, chess: Chess, depth: number, signal: AbortSignal): Promise<move> {
    const fen = chess.fen()
    const color = chess.turn()

    const { bestMove, staticEval, bestMoveCoronation } = chess.isGameOver()
        ? { bestMove: [], staticEval: chess.isCheckmate() ? ["mate"] : ["cp", "0"], bestMoveCoronation: undefined }
        : await analyze(stockfish, fen, depth, signal)

    const bestMoveSan = moveToSan(bestMove, bestMoveCoronation, fen)

    const previousStaticEvals = [staticEval]

    return {
        fen,
        bestMove,
        bestMoveSan,
        color,
        previousStaticEvals,
    }
}

export async function parsePGN(stockfish: Worker, rawPgn: string, depth: number, openings: openings, setProgress: React.Dispatch<SetStateAction<number>>, signal: AbortSignal): Promise<{ metadata: { time: number, players: players, result: result }, moves: move[] }> {
    const chess = new Chess()
    const pgn = clearPgn(rawPgn.replace(/^\uFEFF/, ""))
    try {
        chess.loadPgn(pgn)
    } catch {
        throw new Error("pgn")
    }
    const history = chess.history({ verbose: true })
    if (!history.length) throw new Error("pgn")
    const headers = chess.getHeaders()
    const metadata = { players: getPlayers(headers), time: getTime(headers), result: getResult(headers) }
    chess.load(history[0].before)
    cleanStockfish(stockfish)
    await waitTillReady(stockfish, signal)
    const moves = [await parsePosition(stockfish, chess, depth, signal)]

    for (const [index, move] of history.entries()) {
        const previous = moves[index]
        moves.push(await parseMove(stockfish, depth, move, chess, previous.previousStaticEvals ?? [], previous.bestMoveSan, previous.sacrifice ?? false, openings, signal))
        setProgress(100 * (index + 1) / history.length)
    }
    return { metadata, moves }
}
