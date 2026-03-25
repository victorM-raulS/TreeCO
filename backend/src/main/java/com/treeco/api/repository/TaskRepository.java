package com.treeco.api.repository;

import com.treeco.api.model.Task;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Integer> {
    List<Task> findByProjectId(Integer projectId);

    Optional<Task> findByIdAndProjectId(Integer id, Integer projectId);

    List<Task> findByProjectIdOrderByDateDeadlineAsc(Integer projectId);
}