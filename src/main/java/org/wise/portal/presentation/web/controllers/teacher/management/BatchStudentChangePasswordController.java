/**
 * Copyright (c) 2007 Regents of the University of California (Regents). Created
 * by TELS, Graduate School of Education, University of California at Berkeley.
 *
 * This software is distributed under the GNU Lesser General Public License, v2.
 *
 * Permission is hereby granted, without written agreement and without license
 * or royalty fees, to use, copy, modify, and distribute this software and its
 * documentation for any purpose, provided that the above copyright notice and
 * the following two paragraphs appear in all copies of this software.
 *
 * REGENTS SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE. THE SOFTWAREAND ACCOMPANYING DOCUMENTATION, IF ANY, PROVIDED
 * HEREUNDER IS PROVIDED "AS IS". REGENTS HAS NO OBLIGATION TO PROVIDE
 * MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
 *
 * IN NO EVENT SHALL REGENTS BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT,
 * SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS,
 * ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF
 * REGENTS HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
package org.wise.portal.presentation.web.controllers.teacher.management;

import java.util.Iterator;

import javax.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.acls.domain.BasePermission;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.SessionAttributes;
import org.springframework.web.bind.support.SessionStatus;
import org.wise.portal.dao.ObjectNotFoundException;
import org.wise.portal.domain.authentication.impl.BatchStudentChangePasswordParameters;
import org.wise.portal.domain.group.Group;
import org.wise.portal.domain.run.Run;
import org.wise.portal.domain.user.User;
import org.wise.portal.presentation.validators.ChangePasswordParametersValidator;
import org.wise.portal.presentation.web.controllers.ControllerUtil;
import org.wise.portal.presentation.web.exception.NotAuthorizedException;
import org.wise.portal.service.acl.AclService;
import org.wise.portal.service.group.GroupService;
import org.wise.portal.service.offering.RunService;
import org.wise.portal.service.user.UserService;

/**
 * @author Sally Ahn
 * @version $Id: $
 */
@Controller
@SessionAttributes("batchStudentChangePasswordParameters")
@RequestMapping("/teacher/management/batchstudentchangepassword.html")
public class BatchStudentChangePasswordController {
	
	@Autowired
	private GroupService groupService;
	
	@Autowired
	private UserService userService;
	
	@Autowired
	private RunService runService;
	
	@Autowired
	private AclService<Run> aclService;
	
	@Autowired
	protected ChangePasswordParametersValidator changePasswordParametersValidator;
	
	//the path to this form view
	private String formView = "/teacher/management/batchstudentchangepassword";
	
	//the path to the success view
	private String successView = "/teacher/management/batchstudentchangepasswordsuccess";
	
	private static final String GROUPID_PARAM_NAME = "groupId";
	
	/**
	 * Called before the page is loaded to initialize values
	 * @param model the model object that contains values for the page to use when rendering the view
	 * @param request the http request object
	 * @return the path of the view to display
	 * @throws Exception
	 */
	@RequestMapping(method=RequestMethod.GET)
    public String initializeForm(ModelMap model, HttpServletRequest request) throws Exception {
		User user = ControllerUtil.getSignedInUser();
		Run run = this.runService.retrieveById(Long.parseLong(request.getParameter("runId")));
		
		if(user.isAdmin() ||
				this.aclService.hasPermission(run, BasePermission.ADMINISTRATION, user) ||
				this.aclService.hasPermission(run, BasePermission.WRITE, user)){
			BatchStudentChangePasswordParameters params = new BatchStudentChangePasswordParameters();
			params.setGroupId(Long.parseLong(request.getParameter(GROUPID_PARAM_NAME)));
			params.setTeacherUser(user);
			
			model.addAttribute("batchStudentChangePasswordParameters", params);
		} else {
			throw new NotAuthorizedException("You are not authorized to change these passwords.");
		}
		
		return formView;
	}
	
	/**
     * On submission of the change student passwords (batch) form,
     * all the students' passwords of the selected group (period)
     * are changed to the new password.
     * @param batchStudentChangePasswordParameters the object that contains the values from the form
     * @param bindingResult the object used for validation in which errors will be stored
     * @param sessionStatus the session status object
     */
	@RequestMapping(method=RequestMethod.POST)
	protected String onSubmit(@ModelAttribute("batchStudentChangePasswordParameters") BatchStudentChangePasswordParameters batchStudentChangePasswordParameters, BindingResult bindingResult, SessionStatus sessionStatus) {
    	String view = "";
    	
    	try {
    		//validate the parameters
    		changePasswordParametersValidator.validate(batchStudentChangePasswordParameters, bindingResult);
    		
    		if(bindingResult.hasErrors()) {
    			//there were errors
    			view = formView;
    		} else {
    			//there were no errors
        		Long groupId = batchStudentChangePasswordParameters.getGroupId();
        		Group group = groupService.retrieveById(groupId);
    			Iterator<User> membersIter = group.getMembers().iterator();
    			while(membersIter.hasNext()) {
    				userService.updateUserPassword(membersIter.next(), batchStudentChangePasswordParameters.getPasswd1());
    			}
    			view = successView;
    			sessionStatus.setComplete();
    		}
		} catch (ObjectNotFoundException e) {
			bindingResult.rejectValue("groupId", "error.illegal-groupId"); // add to error list if not there
			view = formView;
		}
    	
    	return view;
    }

}
