import React from "react";
import { Grid, Paper, Tooltip } from "@mui/material";
import ToggleButton from "@mui/material/ToggleButton";

import { ACTIVITIES } from "../constants";

const ActivityMenu = (props) => {
  return (
    <Grid
      container
      justifyContent={
        props.pluginPosition === "right" ? "flex-end" : "flex-start"
      }
    >
      <Paper elevation={4}>
        {ACTIVITIES.map((activity, index) => {
          return (
            <div key={index} style={{ padding: 8 }}>
              <Tooltip disableInteractive title={activity.tooltip}>
                <ToggleButton
                  sx={{ color: "text.primary" }}
                  value={activity.id}
                  selected={props.activityId === activity.id}
                  onChange={() => {
                    props.setActivityId(activity.id);
                  }}
                >
                  {activity.icon}
                </ToggleButton>
              </Tooltip>
            </div>
          );
        })}
      </Paper>
    </Grid>
  );
};
export default ActivityMenu;
