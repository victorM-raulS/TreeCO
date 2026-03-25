package com.treeco.api.dto.user;

import java.time.LocalDateTime;

/**
 * DTO de respuesta para Task — evita ciclos de serialización JSON
 * (Task → CodeTask → Task → ...) devolviendo solo campos planos.
 */
public class TaskResponseDto {

    private Integer id;
    private String title;
    private String description;
    private LocalDateTime dateCreation;
    private LocalDateTime dateDeadline;
    private String priority;
    private Boolean completed;
    private String state;
    private String type;

    private Integer projectId;
    private String projectName;

    // Assignee (aplanado para evitar ciclos User → projects → tasks)
    private AssignedToDto assignedTo;

    // CodeTask (aplanado para evitar ciclo CodeTask → Task → CodeTask)
    private CodeTaskDto codeTask;

    public TaskResponseDto() {}

    /* ── Nested DTOs ─────────────────────────── */

    public static class AssignedToDto {
        private Integer id;
        private String username;
        private String email;

        public AssignedToDto() {}
        public AssignedToDto(Integer id, String username, String email) {
            this.id = id; this.username = username; this.email = email;
        }

        public Integer getId()       { return id; }
        public void setId(Integer id){ this.id = id; }
        public String getUsername()  { return username; }
        public void setUsername(String u){ this.username = u; }
        public String getEmail()     { return email; }
        public void setEmail(String e)   { this.email = e; }
    }

    public static class CodeTaskDto {
        private Long id;
        private String language;
        private String repositoryUrl;
        private String branchName;
        private String pullRequestUrl;
        private String reviewStatus;
        private String reviewNotes;
        private Integer estimatedHours;
        private Integer actualHours;

        public CodeTaskDto() {}

        public Long getId()                  { return id; }
        public void setId(Long id)           { this.id = id; }
        public String getLanguage()          { return language; }
        public void setLanguage(String l)    { this.language = l; }
        public String getRepositoryUrl()     { return repositoryUrl; }
        public void setRepositoryUrl(String u){ this.repositoryUrl = u; }
        public String getBranchName()        { return branchName; }
        public void setBranchName(String b)  { this.branchName = b; }
        public String getPullRequestUrl()    { return pullRequestUrl; }
        public void setPullRequestUrl(String p){ this.pullRequestUrl = p; }
        public String getReviewStatus()      { return reviewStatus; }
        public void setReviewStatus(String s){ this.reviewStatus = s; }
        public String getReviewNotes()       { return reviewNotes; }
        public void setReviewNotes(String n) { this.reviewNotes = n; }
        public Integer getEstimatedHours()   { return estimatedHours; }
        public void setEstimatedHours(Integer h){ this.estimatedHours = h; }
        public Integer getActualHours()      { return actualHours; }
        public void setActualHours(Integer h){ this.actualHours = h; }
    }

    /* ── Getters / Setters ───────────────────── */

    public Integer getId()               { return id; }
    public void setId(Integer id)        { this.id = id; }
    public String getTitle()             { return title; }
    public void setTitle(String t)       { this.title = t; }
    public String getDescription()       { return description; }
    public void setDescription(String d) { this.description = d; }
    public LocalDateTime getDateCreation()                    { return dateCreation; }
    public void setDateCreation(LocalDateTime d)              { this.dateCreation = d; }
    public LocalDateTime getDateDeadline()                    { return dateDeadline; }
    public void setDateDeadline(LocalDateTime d)              { this.dateDeadline = d; }
    public String getPriority()           { return priority; }
    public void setPriority(String p)     { this.priority = p; }
    public Boolean getCompleted()         { return completed; }
    public void setCompleted(Boolean c)   { this.completed = c; }
    public String getState()              { return state; }
    public void setState(String s)        { this.state = s; }
    public String getType()               { return type; }
    public void setType(String t)         { this.type = t; }
    public Integer getProjectId()         { return projectId; }
    public void setProjectId(Integer p)   { this.projectId = p; }
    public String getProjectName()        { return projectName; }
    public void setProjectName(String n)  { this.projectName = n; }
    public AssignedToDto getAssignedTo()              { return assignedTo; }
    public void setAssignedTo(AssignedToDto a)        { this.assignedTo = a; }
    public CodeTaskDto getCodeTask()                  { return codeTask; }
    public void setCodeTask(CodeTaskDto ct)           { this.codeTask = ct; }
}