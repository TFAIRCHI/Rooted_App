UPDATE memberships SET capabilities=array_append(capabilities,'theme:manage') WHERE ('plans:edit'=ANY(capabilities) OR 'content:approve'=ANY(capabilities)) AND NOT ('theme:manage'=ANY(capabilities));
