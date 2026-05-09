package com.medical.entity;

public enum Role {
    PATIENT("Пациент"),
    DOCTOR("Врач"),
    ADMIN("Администратор");

    private final String displayName;

    Role(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
