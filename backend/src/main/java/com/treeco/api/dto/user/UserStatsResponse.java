package com.treeco.api.dto.user;

public class UserStatsResponse {
    private Integer userId;
    private String username;
    private Integer totalProjects;
    private Integer totalTasks;
    private Integer completedTasks;
    private Integer expiredTasks;
    private Double globalProgress;

    public UserStatsResponse() {}

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public Integer getTotalProjects() {
        return totalProjects;
    }

    public void setTotalProjects(Integer totalProjects) {
        this.totalProjects = totalProjects;
    }

    public Integer getTotalTasks() {
        return totalTasks;
    }

    public void setTotalTasks(Integer totalTasks) {
        this.totalTasks = totalTasks;
    }

    public Integer getCompletedTasks() {
        return completedTasks;
    }

    public void setCompletedTasks(Integer completedTasks) {
        this.completedTasks = completedTasks;
    }

    public Integer getExpiredTasks() {
        return expiredTasks;
    }

    public void setExpiredTasks(Integer expiredTasks) {
        this.expiredTasks = expiredTasks;
    }

    public Double getGlobalProgress() {
        return globalProgress;
    }

    public void setGlobalProgress(Double globalProgress) {
        this.globalProgress = globalProgress;
    }

    @Override
    public String toString() {
        return String.format(
            "UserStats[userId=%d, username=%s, projects=%d, tasks=%d, completed=%d, expired=%d, progress=%.2f%%]",
            userId, username, totalProjects, totalTasks, completedTasks, expiredTasks, globalProgress
        );
    }
}