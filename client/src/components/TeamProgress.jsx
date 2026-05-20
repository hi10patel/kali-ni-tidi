// Two stacked progress bars — one for the bidding team (in bidder's color),
// one for the opposition (blue). Each fills toward its team's victory threshold.
import { playerColor, OPP_COLOR } from '../colors.js';

export default function TeamProgress({ game }) {
  const bidderColor = game.highestBidderId ? playerColor(game.highestBidderId, game.players) : '#888';
  const bidGoal = game.highestBid || 0;
  const oppGoal = game.opposingTarget || (255 - game.highestBid);

  const bidCur = game.teamPoints.bidding;
  const oppCur = game.teamPoints.opposing;

  const bidPct = bidGoal ? Math.min(100, Math.round((bidCur / bidGoal) * 100)) : 0;
  const oppPct = oppGoal ? Math.min(100, Math.round((oppCur / oppGoal) * 100)) : 0;

  const bidMade = bidCur >= bidGoal && bidGoal > 0;
  const oppMade = oppCur >= oppGoal && oppGoal > 0;

  return (
    <div className="team-progress">
      <Bar
        label="Bidding team"
        color={bidderColor}
        current={bidCur}
        goal={bidGoal}
        pct={bidPct}
        done={bidMade}
        doneLabel="bid made"
      />
      <Bar
        label="Opposition"
        color={OPP_COLOR}
        current={oppCur}
        goal={oppGoal}
        pct={oppPct}
        done={oppMade}
        doneLabel="bidder defeated"
        striped
      />
    </div>
  );
}

function Bar({ label, color, current, goal, pct, done, doneLabel, striped }) {
  return (
    <div className={`tp-row ${done ? 'tp-done' : ''} ${striped ? 'tp-striped' : ''}`} style={{ '--bar-color': color }}>
      <div className="tp-head">
        <span className="tp-label">
          <span className="tp-swatch" />
          {label}
        </span>
        <span className="tp-value">
          {done ? `✓ ${doneLabel}` : <>{current} <small>/ {goal}</small></>}
        </span>
      </div>
      <div className="tp-track">
        <div className="tp-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
